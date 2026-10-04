import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Bell, BellOff, CheckCircle2, Mic, MicOff, RefreshCw, Send, Sparkles, Target, Timer, Trash2, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { todayISO } from '../lib/date';
import { nextTask, overdueTasks, pendingHabits, formatTime } from '../lib/jarvis/brain';
import { useJarvis } from '../lib/jarvis/JarvisContext';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/jarvis/speech';
import { usePlanner } from '../lib/PlannerContext';
import { describeReminder, notificationPermission, requestNotificationPermission } from '../lib/reminders';
import { useSettings } from '../lib/SettingsContext';
import { JarvisOrb } from './JarvisOrb';
import { ProgressRing } from './ProgressRing';

const SUGGESTIONS = ['What’s on today?', 'Plan my day', 'What’s next?', 'Remind me to drink water in 1 hour', 'Focus 25', 'Motivate me'];

export function JarvisView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { tasks, habits, moveTask } = usePlanner();
  const { settings } = useSettings();
  const { briefing, refreshBriefing, reminders, focus, startFocus, stopFocus } = useJarvis();
  const [perm, setPerm] = useState<string>('granted');

  useEffect(() => {
    void notificationPermission().then(setPerm);
  }, []);

  const today = todayISO();
  const todays = tasks.filter((t) => t.date === today);
  const done = todays.filter((t) => t.done).length;
  const next = nextTask(tasks);
  const overdue = overdueTasks(tasks, today);
  const habitsLeft = pendingHabits(habits, today);

  return (
    // Phone: briefing → chat → extras. Desktop: chat on the left, the rest stacked on the right.
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_340px] lg:grid-rows-[auto_1fr] lg:gap-x-6">
      <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <Chat />
      </div>

      <div className="-order-1 lg:order-none lg:col-start-2 lg:row-start-1">
        {/* Briefing */}
        <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-soft via-paper-raised to-paper-raised p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <JarvisOrb size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Daily briefing</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{briefing}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canSpeak && (
              <button onClick={() => speak(briefing)} className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-ink">
                <Volume2 size={13} /> Read aloud
              </button>
            )}
            <button onClick={refreshBriefing} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-4 lg:col-start-2 lg:row-start-2">
        {perm !== 'granted' && perm !== 'unsupported' && (
          <button
            onClick={async () => {
              await requestNotificationPermission();
              setPerm(await notificationPermission());
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-amber/50 bg-amber/10 p-4 text-left"
          >
            <BellOff size={20} className="shrink-0 text-amber" />
            <span className="text-sm text-ink">
              <strong className="block font-semibold">Turn on notifications</strong>
              <span className="text-ink-soft">{perm === 'denied' ? 'Notifications are blocked — enable them for Jarvis in your phone’s settings.' : 'So Jarvis can remind you even when the app is closed.'}</span>
            </span>
          </button>
        )}

        {/* At a glance */}
        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-line bg-paper-raised p-4">
            <ProgressRing value={todays.length ? done / todays.length : 0} size={48} strokeWidth={5} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {done} of {todays.length} done today
              </p>
              <p className="truncate text-xs text-ink-faint">{next ? `Next: ${next.title}${next.time ? ` · ${formatTime(next.time)}` : ''}` : 'Nothing else queued'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-paper-raised p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <AlarmClock size={13} /> Overdue
            </p>
            <p className={`mt-1 font-display text-2xl font-semibold ${overdue.length ? 'text-coral' : 'text-ink'}`}>{overdue.length}</p>
            {overdue.length > 0 && (
              <button onClick={() => overdue.forEach((t) => moveTask(t.id, today))} className="mt-1 text-xs font-medium text-brand hover:underline">
                Move to today
              </button>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-paper-raised p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <Target size={13} /> Habits left
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{habitsLeft.length}</p>
            <p className="truncate text-xs text-ink-faint">{habitsLeft.map((h) => h.name).join(', ') || 'All done 🎉'}</p>
          </div>
        </section>

        <FocusCard focus={focus} defaultMinutes={settings.focusMinutes} onStart={startFocus} onStop={stopFocus} />

        {/* Upcoming reminders */}
        <section className="rounded-2xl border border-line bg-paper-raised p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Bell size={14} /> Upcoming reminders
            </h3>
            <button onClick={onOpenSettings} className="text-xs font-medium text-brand hover:underline">
              Settings
            </button>
          </div>
          {reminders.length === 0 ? (
            <p className="text-xs text-ink-faint">No reminders scheduled. Give a task a time and Jarvis will remind you.</p>
          ) : (
            <ul className="space-y-1.5">
              {reminders.slice(0, 5).map((r) => (
                <li key={`${r.id}-${r.at.getTime()}`} className="truncate text-xs text-ink-soft">
                  {describeReminder(r)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function FocusCard({
  focus,
  defaultMinutes,
  onStart,
  onStop,
}: {
  focus: { endsAt: number; minutes: number } | null;
  defaultMinutes: number;
  onStart: (m: number) => void;
  onStop: () => void;
}) {
  // The Jarvis context re-renders every second while a session runs.
  if (focus) {
    const left = Math.max(0, focus.endsAt - Date.now());
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    const progress = 1 - left / (focus.minutes * 60_000);
    return (
      <section className="flex items-center gap-4 rounded-2xl border border-brand/40 bg-brand-soft p-4">
        <ProgressRing value={progress} size={56} strokeWidth={5} />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Focus mode</p>
          <p className="font-mono text-2xl font-medium text-ink">
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </p>
        </div>
        <button onClick={onStop} className="rounded-full border border-line bg-paper-raised p-2 text-ink-soft hover:text-danger" aria-label="Stop focus">
          <X size={16} />
        </button>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-paper-raised p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Timer size={14} /> Focus timer
      </h3>
      <p className="mt-1 text-xs text-ink-faint">Work in a distraction-free sprint. Jarvis will ping you when it’s break time.</p>
      <div className="mt-3 flex gap-2">
        {[15, defaultMinutes, 50].filter((v, i, a) => a.indexOf(v) === i).map((m) => (
          <button key={m} onClick={() => onStart(m)} className="flex-1 rounded-lg border border-line py-1.5 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand">
            {m} min
          </button>
        ))}
      </div>
    </section>
  );
}

function Chat() {
  const { messages, thinking, send, clearChat } = useJarvis();
  const { settings } = useSettings();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  const submit = (text = input) => {
    if (!text.trim() || thinking) return;
    stopSpeaking();
    setInput('');
    void send(text);
  };

  const toggleMic = () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setListening(true);
    stopRef.current = listen(
      (text, final) => {
        setInput(text);
        if (final) submit(text);
      },
      () => setListening(false),
    );
  };

  return (
    <section className="flex h-[calc(100svh-13rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-soft lg:h-[calc(100svh-9rem)]">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <JarvisOrb size={36} active={thinking} />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold leading-tight text-ink">Jarvis</p>
          <p className="text-xs text-ink-faint">{thinking ? 'Thinking…' : settings.apiKey ? 'AI mode · online' : 'Quick mode · works offline'}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="rounded-lg p-2 text-ink-faint hover:bg-paper-sunken hover:text-ink" aria-label="Clear conversation">
            <Trash2 size={16} />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <JarvisOrb size={72} />
            <p className="mt-4 font-display text-xl font-semibold text-ink">How can I help{settings.userName ? `, ${settings.userName}` : ''}?</p>
            <p className="mt-1 max-w-sm text-sm text-ink-faint">
              Tell me what you need to do and when. I’ll add it to your planner and remind you. Try one of these:
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex items-end gap-2'}
            >
              {m.role === 'jarvis' && (
                <span className="mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
                  <Sparkles size={12} />
                </span>
              )}
              <div
                className={[
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'rounded-br-md bg-brand text-brand-ink' : 'rounded-bl-md border border-line bg-paper text-ink',
                ].join(' ')}
              >
                {m.text}
                {m.role === 'jarvis' && canSpeak && (
                  <button onClick={() => speak(m.text)} className="ml-2 inline-flex align-middle text-ink-faint hover:text-brand" aria-label="Read aloud">
                    <Volume2 size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && (
          <div className="flex items-center gap-1 pl-8">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-brand/60" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-3">
        <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-brand hover:text-brand"
            >
              {s === 'What’s on today?' && <CheckCircle2 size={11} />}
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2"
        >
          {canListen && (
            <button
              type="button"
              onClick={toggleMic}
              className={`rounded-full p-2.5 ${listening ? 'animate-pulse bg-coral text-white' : 'border border-line text-ink-soft hover:border-brand hover:text-brand'}`}
              aria-label={listening ? 'Stop listening' : 'Speak to Jarvis'}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? 'Listening…' : 'Ask Jarvis or say “remind me to…”'}
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="rounded-full bg-brand p-2.5 text-brand-ink shadow-soft transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
