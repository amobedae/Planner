import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChatMessage } from '../../types';
import { createId } from '../id';
import { usePlanner } from '../PlannerContext';
import {
  buildReminders,
  cancelFocusEnd,
  isNative,
  scheduleFocusEnd,
  showWebNotification,
  syncNativeReminders,
  type Reminder,
} from '../reminders';
import { useSettings } from '../SettingsContext';
import { useLocalStorage } from '../storage';
import { buildBriefing, respond, type PlannerOps } from './brain';
import { speak } from './speech';

export type Toast = { id: string; title: string; body: string };
export type FocusState = { endsAt: number; minutes: number } | null;

type JarvisContextValue = {
  messages: ChatMessage[];
  thinking: boolean;
  send: (text: string) => Promise<void>;
  clearChat: () => void;
  briefing: string;
  refreshBriefing: () => void;
  focus: FocusState;
  startFocus: (minutes: number) => void;
  stopFocus: () => void;
  reminders: Reminder[];
  toasts: Toast[];
  dismissToast: (id: string) => void;
  /** Set when a notification was tapped; the app switches to Jarvis. */
  openRequest: number;
};

const JarvisContext = createContext<JarvisContextValue | null>(null);

const MAX_HISTORY = 80;

export function JarvisProvider({ children }: { children: ReactNode }) {
  const planner = usePlanner();
  const { settings } = useSettings();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('jarvis.chat', []);
  const [focus, setFocus] = useLocalStorage<FocusState>('jarvis.focus', null);
  const [thinking, setThinking] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [briefingSeed, setBriefingSeed] = useState(0);
  const [openRequest, setOpenRequest] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  // Always hand Jarvis the latest planner state, even from async callbacks.
  const opsRef = useRef<PlannerOps>(planner);
  opsRef.current = planner;

  const pushToast = useCallback((title: string, body: string) => {
    const id = createId();
    setToasts((prev) => [...prev.slice(-2), { id, title, body }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const appendMessage = useCallback(
    (role: ChatMessage['role'], text: string) => {
      setMessages((prev) => [...prev, { id: createId(), role, text, at: Date.now() }].slice(-MAX_HISTORY));
    },
    [setMessages],
  );

  const startFocus = useCallback(
    (minutes: number) => {
      setFocus({ endsAt: Date.now() + minutes * 60_000, minutes });
      void scheduleFocusEnd(minutes);
    },
    [setFocus],
  );

  const stopFocus = useCallback(() => {
    setFocus(null);
    void cancelFocusEnd();
  }, [setFocus]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const history = messages;
      appendMessage('user', text);
      setThinking(true);
      let reply;
      try {
        if (settings.apiKey.trim()) {
          // Loaded on demand so the SDK isn't in the startup bundle.
          const { askClaude, JarvisAIError } = await import('./claude');
          try {
            reply = await askClaude(text, history, opsRef.current, settings);
          } catch (err) {
            if (err instanceof JarvisAIError && err.message === 'offline') {
              reply = respond(text, opsRef.current, settings);
              reply = { ...reply, text: `(Offline mode) ${reply.text}` };
            } else if (err instanceof JarvisAIError) {
              reply = { text: err.message };
            } else {
              throw err;
            }
          }
        } else {
          // Small pause so the reply feels conversational.
          await new Promise((r) => setTimeout(r, 250));
          reply = respond(text, opsRef.current, settings);
        }
      } catch (err) {
        reply = { text: `Something went wrong: ${err instanceof Error ? err.message : String(err)}` };
      } finally {
        setThinking(false);
      }
      appendMessage('jarvis', reply.text);
      if (reply.effect?.type === 'focus') startFocus(reply.effect.minutes);
      if (settings.voice) speak(reply.text);
    },
    [messages, appendMessage, settings, startFocus],
  );

  const clearChat = useCallback(() => setMessages([]), [setMessages]);

  // Tick every 20s: drives the web reminder engine, focus timer and briefing freshness.
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const reminders = useMemo(
    () => buildReminders(planner.tasks, planner.habits, settings, new Date(clock)),
    [planner.tasks, planner.habits, settings, clock],
  );

  // Native: keep the OS notification schedule in sync (debounced).
  const reminderKey = useMemo(() => reminders.map((r) => `${r.id}@${r.at.getTime()}:${r.body}`).join('|'), [reminders]);
  useEffect(() => {
    if (!isNative) return;
    const id = window.setTimeout(() => {
      void syncNativeReminders(reminders).catch(() => {});
    }, 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderKey]);

  // Web: fire reminders that came due since the last tick (only while the app is open).
  const lastCheck = useRef(Date.now());
  const allRemindersRef = useRef<Reminder[]>([]);
  useEffect(() => {
    if (isNative) return;
    const now = clock;
    const due = allRemindersRef.current.filter((r) => r.at.getTime() > lastCheck.current && r.at.getTime() <= now);
    lastCheck.current = now;
    allRemindersRef.current = reminders;
    for (const r of due) {
      pushToast(r.title, r.body);
      void showWebNotification(r.title, r.body);
      if (settings.voice && r.kind === 'task') speak(`${r.title.replace('⏰', '')}. ${r.body}`);
    }
  }, [clock, reminders, pushToast, settings.voice]);

  // Focus session finished?
  useEffect(() => {
    if (focus && clock >= focus.endsAt) {
      setFocus(null);
      const body = `Great work — ${focus.minutes} minutes done. Take a 5-minute break.`;
      pushToast('Focus session complete 🎯', body);
      if (!isNative) void showWebNotification('Focus session complete 🎯', body);
      if (settings.voice) speak(body);
    }
  }, [clock, focus, setFocus, pushToast, settings.voice]);

  // While focusing, tick every second so the countdown is smooth.
  useEffect(() => {
    if (!focus) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [focus]);

  // Native: foreground notifications become in-app toasts; taps open Jarvis.
  useEffect(() => {
    if (!isNative) return;
    const handles = [
      LocalNotifications.addListener('localNotificationReceived', (n) => {
        pushToast(n.title ?? 'Jarvis', n.body ?? '');
        setClock(Date.now());
      }),
      LocalNotifications.addListener('localNotificationActionPerformed', () => {
        setOpenRequest((n) => n + 1);
        setBriefingSeed((n) => n + 1);
      }),
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          setClock(Date.now());
          setBriefingSeed((n) => n + 1);
        }
      }),
    ];
    return () => {
      handles.forEach((h) => void h.then((x) => x.remove()));
    };
  }, [pushToast]);

  const briefing = useMemo(
    () => buildBriefing(planner, settings, new Date()),
    // Re-roll on data changes or explicit refresh; deliberately not on every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planner.tasks, planner.habits, settings.userName, briefingSeed],
  );

  const value: JarvisContextValue = {
    messages,
    thinking,
    send,
    clearChat,
    briefing,
    refreshBriefing: () => setBriefingSeed((n) => n + 1),
    focus,
    startFocus,
    stopFocus,
    reminders,
    toasts,
    dismissToast,
    openRequest,
  };

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis(): JarvisContextValue {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis must be used within JarvisProvider');
  return ctx;
}
