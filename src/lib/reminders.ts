import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { format } from 'date-fns';
import type { Habit, JarvisSettings, Task } from '../types';
import { addDays, fromISO, toISO } from './date';
import { formatTime } from './jarvis/brain';

export const isNative = Capacitor.isNativePlatform();

/** A reminder Jarvis will deliver at `at`. */
export type Reminder = { id: number; at: Date; title: string; body: string; kind: 'task' | 'briefing' | 'review' | 'focus' };

const BRIEFING_DAYS = 14;
// iOS only keeps 64 pending local notifications per app.
const MAX_PENDING = 60;
export const FOCUS_NOTIFICATION_ID = 900_001;

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  // Keep within Java int range and away from fixed ids.
  return (Math.abs(h) % 800_000_000) + 1_000_000;
}

function at(dateIso: string, time: string): Date {
  const d = fromISO(dateIso);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function buildReminders(tasks: Task[], habits: Habit[], settings: JarvisSettings, now = new Date()): Reminder[] {
  const out: Reminder[] = [];
  const today = toISO(now);

  for (const t of tasks) {
    if (t.done || !t.time || t.remindMinutes == null) continue;
    const when = new Date(at(t.date, t.time).getTime() - t.remindMinutes * 60_000);
    if (when <= now) continue;
    const lead = t.remindMinutes === 0 ? 'Now' : t.remindMinutes >= 60 * 24 ? 'Tomorrow' : `In ${t.remindMinutes >= 60 ? `${t.remindMinutes / 60}h` : `${t.remindMinutes} min`}`;
    out.push({
      id: hashId(t.id),
      at: when,
      title: `⏰ ${t.title}`,
      body: `${lead} — scheduled for ${formatTime(t.time)}${t.notes ? `. ${t.notes}` : ''}`,
      kind: 'task',
    });
  }

  for (let i = 0; i < BRIEFING_DAYS; i++) {
    const day = addDays(today, i);
    const dayTasks = tasks.filter((t) => t.date === day && !t.done);
    if (settings.morningBriefing) {
      const when = at(day, settings.morningBriefing);
      if (when > now) {
        const first = dayTasks.filter((t) => t.time).sort((a, b) => a.time!.localeCompare(b.time!))[0];
        const name = settings.userName.trim() ? `, ${settings.userName.trim()}` : '';
        out.push({
          id: 100 + i,
          at: when,
          title: `Good morning${name} ☀️`,
          body: dayTasks.length
            ? `You have ${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'} today${first ? `. First up: ${first.title} at ${formatTime(first.time!)}` : ''}. Tap for your briefing.`
            : 'Your day is open. Tap to plan it with Jarvis.',
          kind: 'briefing',
        });
      }
    }
    if (settings.eveningReview) {
      const when = at(day, settings.eveningReview);
      if (when > now) {
        const habitCount = habits.filter((h) => !h.archived).length;
        out.push({
          id: 200 + i,
          at: when,
          title: 'Evening check-in 🌙',
          body: `Tick off what you finished${habitCount ? ', log your habits' : ''} and set up tomorrow.`,
          kind: 'review',
        });
      }
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING);
}

let channelReady = false;

async function ensureNativeSetup() {
  if (channelReady) return;
  channelReady = true;
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: 'jarvis',
      name: 'Jarvis reminders',
      description: 'Task reminders, briefings and focus timers',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  }
}

function toNative(r: Reminder): LocalNotificationSchema {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    schedule: { at: r.at, allowWhileIdle: true },
    channelId: 'jarvis',
    extra: { kind: r.kind },
  };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (isNative) {
    const res = await LocalNotifications.checkPermissions();
    return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'prompt';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

/** Replace all pending native notifications with the current set. */
export async function syncNativeReminders(reminders: Reminder[]) {
  if (!isNative) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;
  await ensureNativeSetup();
  const pending = await LocalNotifications.getPending();
  const stale = pending.notifications.filter((n) => n.id !== FOCUS_NOTIFICATION_ID);
  if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
  if (reminders.length) await LocalNotifications.schedule({ notifications: reminders.map(toNative) });
}

/** Show a notification immediately (web) — used while the app is open. */
export async function showWebNotification(title: string, body: string) {
  if (isNative || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title });
      return;
    }
    new Notification(title, { body, icon: 'icons/icon-192.png' });
  } catch {
    // some browsers (e.g. Android Chrome without a service worker) throw here
  }
}

export async function scheduleFocusEnd(minutes: number) {
  const when = new Date(Date.now() + minutes * 60_000);
  if (isNative) {
    await ensureNativeSetup();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: FOCUS_NOTIFICATION_ID,
          title: 'Focus session complete 🎯',
          body: `Great work — ${minutes} minutes done. Take a 5-minute break.`,
          schedule: { at: when, allowWhileIdle: true },
          channelId: 'jarvis',
        },
      ],
    });
  }
  return when;
}

export async function cancelFocusEnd() {
  if (isNative) await LocalNotifications.cancel({ notifications: [{ id: FOCUS_NOTIFICATION_ID }] });
}

export function describeReminder(r: Reminder): string {
  return `${format(r.at, 'EEE h:mm a')} — ${r.title.replace(/^⏰ /, '')}`;
}
