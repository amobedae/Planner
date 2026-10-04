import { addMinutes, format, nextDay, type Day } from 'date-fns';
import { currentStreak } from '../../components/HabitsView';
import type { Habit, JarvisSettings, Priority, Task } from '../../types';
import { addDays, formatLong, toISO, todayISO } from '../date';
import type { NewTaskInput } from '../PlannerContext';

/** The slice of the planner Jarvis is allowed to read and act on. */
export type PlannerOps = {
  tasks: Task[];
  habits: Habit[];
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, date: string) => void;
  toggleHabitDate: (id: string, date: string, value?: boolean) => void;
};

export type JarvisReply = {
  text: string;
  effect?: { type: 'focus'; minutes: number };
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const MOTIVATION = [
  'Small steps every day add up to big results.',
  'Done is better than perfect. Start with the first five minutes.',
  'You don’t have to see the whole staircase, just take the first step.',
  'Focus on what you can control today. That’s more than enough.',
  'Discipline is choosing what you want most over what you want now.',
  'One task at a time. You’ve got this.',
  'Progress, not perfection.',
  'The secret of getting ahead is getting started.',
];

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function greeting(settings: JarvisSettings, now = new Date()): string {
  const h = now.getHours();
  const part = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return settings.userName.trim() ? `${part}, ${settings.userName.trim()}` : part;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, m === 0 ? 'h a' : 'h:mm a');
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!!a.time !== !!b.time) return a.time ? -1 : 1;
    if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

function describe(task: Task): string {
  return task.time ? `“${task.title}” at ${formatTime(task.time)}` : `“${task.title}”`;
}

function bulletList(tasks: Task[]): string {
  return sortTasks(tasks)
    .map((t) => `• ${t.done ? '✓ ' : ''}${t.time ? `${formatTime(t.time)} — ` : ''}${t.title}${t.priority === 'high' ? ' (high priority)' : ''}`)
    .join('\n');
}

export function overdueTasks(tasks: Task[], today = todayISO()): Task[] {
  return tasks.filter((t) => !t.done && t.date < today);
}

export function nextTask(tasks: Task[], now = new Date()): Task | undefined {
  const today = toISO(now);
  const hhmm = format(now, 'HH:mm');
  const todays = sortTasks(tasks.filter((t) => t.date === today && !t.done));
  return todays.find((t) => t.time && t.time >= hhmm) ?? todays.find((t) => !t.time);
}

export function pendingHabits(habits: Habit[], date = todayISO()): Habit[] {
  return habits.filter((h) => !h.archived && !h.completedDates.includes(date));
}

/** A short spoken-style summary of the day. */
export function buildBriefing(ops: Pick<PlannerOps, 'tasks' | 'habits'>, settings: JarvisSettings, now = new Date()): string {
  const today = toISO(now);
  const todays = ops.tasks.filter((t) => t.date === today);
  const open = todays.filter((t) => !t.done);
  const overdue = overdueTasks(ops.tasks, today);
  const habitsLeft = pendingHabits(ops.habits, today);
  const next = nextTask(ops.tasks, now);

  const lines: string[] = [`${greeting(settings, now)}. It’s ${formatLong(today)}.`];

  if (todays.length === 0) {
    lines.push('Your day is a clean slate — nothing scheduled yet. Tell me what you’d like to get done.');
  } else if (open.length === 0) {
    lines.push(`All ${todays.length} of today’s tasks are done. Outstanding work.`);
  } else {
    lines.push(
      `You have ${open.length} task${open.length === 1 ? '' : 's'} left today${
        todays.length > open.length ? ` (${todays.length - open.length} already done)` : ''
      }.`,
    );
    if (next) lines.push(`Next up: ${describe(next)}.`);
    const high = open.filter((t) => t.priority === 'high' && t.id !== next?.id);
    if (high.length) lines.push(`Don’t forget the high-priority ${high.length === 1 ? 'one' : 'ones'}: ${high.map((t) => `“${t.title}”`).join(', ')}.`);
  }

  if (overdue.length) {
    lines.push(`You also have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}. Say “move overdue to today” and I’ll bring ${overdue.length === 1 ? 'it' : 'them'} forward.`);
  }
  if (habitsLeft.length) {
    lines.push(`Habits still to tick off: ${habitsLeft.map((h) => h.name).join(', ')}.`);
  }
  lines.push(pick(MOTIVATION));
  return lines.join(' ');
}

// ---------------------------------------------------------------------------
// Natural-language date/time parsing ("tomorrow at 5pm", "in 20 minutes", …)
// ---------------------------------------------------------------------------

const WEEKDAYS: Record<string, Day> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type ParsedWhen = { date: string; time?: string; rest: string; explicitDate: boolean };

export function parseWhen(input: string, now = new Date()): ParsedWhen {
  let text = ` ${input} `;
  let date = toISO(now);
  let time: string | undefined;
  let explicitDate = false;

  const cut = (re: RegExp) => {
    text = text.replace(re, ' ');
  };

  // Relative: "in 20 minutes", "in 2 hours", "in an hour"
  const rel = text.match(/\s+in\s+(an?|\d+)\s*(min(?:ute)?s?|h(?:ou)?rs?|hours?)\b/i);
  if (rel) {
    const n = /^an?$/i.test(rel[1]) ? 1 : Number(rel[1]);
    const mins = /^h/i.test(rel[2]) ? n * 60 : n;
    const at = addMinutes(now, mins);
    date = toISO(at);
    time = format(at, 'HH:mm');
    explicitDate = true;
    cut(new RegExp(escapeRe(rel[0]), 'i'));
  }

  // Day words
  if (/\b(day after tomorrow)\b/i.test(text)) {
    date = addDays(toISO(now), 2);
    explicitDate = true;
    cut(/\s*\b(on\s+)?(the\s+)?day after tomorrow\b/i);
  } else if (/\b(tomorrow|tmrw|tmr)\b/i.test(text)) {
    date = addDays(toISO(now), 1);
    explicitDate = true;
    cut(/\s*\b(tomorrow|tmrw|tmr)\b/i);
  } else if (/\b(today|tonight|this (morning|afternoon|evening))\b/i.test(text)) {
    explicitDate = true;
  }

  const wd = text.match(/\b(?:on\s+|next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)\b/i);
  if (wd && !rel) {
    const target = WEEKDAYS[wd[1].toLowerCase()];
    date = now.getDay() === target && !/next/i.test(wd[0]) ? toISO(now) : toISO(nextDay(now, target));
    explicitDate = true;
    cut(new RegExp(`\\s*${wd[0].replace(/\s+/g, '\\s+')}\\b`, 'i'));
  }

  // Explicit times
  if (!time) {
    const t = text.match(/\b(?:at\s+|@\s*|by\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i) ?? text.match(/\b(?:at\s+|@\s*)(\d{1,2}):(\d{2})\b()/i) ?? text.match(/\b(\d{1,2}):(\d{2})\b()/);
    if (t) {
      let h = Number(t[1]);
      const m = t[2] ? Number(t[2]) : 0;
      const ap = (t[3] ?? '').toLowerCase().replace(/\./g, '');
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (h < 24 && m < 60) {
        time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        cut(new RegExp(escapeRe(t[0]), 'i'));
      }
    } else if (/\b(at\s+)?noon\b/i.test(text)) {
      time = '12:00';
      cut(/\s*\b(at\s+)?noon\b/i);
    } else if (/\b(at\s+)?midnight\b/i.test(text)) {
      time = '23:59';
      cut(/\s*\b(at\s+)?midnight\b/i);
    }
  }

  // Soft times of day
  const soft: [RegExp, string][] = [
    [/\b(this |in the )morning\b/i, '09:00'],
    [/\b(this |in the )afternoon\b/i, '14:00'],
    [/\b(this |in the )evening\b/i, '18:00'],
    [/\btonight\b/i, '20:00'],
  ];
  for (const [re, value] of soft) {
    if (re.test(text)) {
      if (!time) time = value;
      cut(new RegExp(`\\s*(${re.source})`, 'i'));
    }
  }
  cut(/\s*\btoday\b/i);

  // If a bare time today has already passed, assume tomorrow.
  if (time && !explicitDate && date === toISO(now) && time < format(now, 'HH:mm')) {
    date = addDays(date, 1);
  }

  const rest = text
    .replace(/\s+/g, ' ')
    .replace(/\s+(on|at|by|for)\s*$/i, '')
    .trim()
    .replace(/[.!?]+$/, '');
  return { date, time, rest, explicitDate };
}

// ---------------------------------------------------------------------------
// Fuzzy matching tasks / habits by name
// ---------------------------------------------------------------------------

const STOP = new Set(['the', 'a', 'an', 'my', 'to', 'task', 'as', 'it', 'is', 'of', 'for', 'and', 'with', 'i']);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));

export function bestMatch<T>(items: T[], query: string, label: (item: T) => string): T | undefined {
  const q = words(query);
  if (!q.length) return undefined;
  let best: T | undefined;
  let bestScore = 0;
  for (const item of items) {
    const name = label(item).toLowerCase();
    const w = words(name);
    let score = q.filter((x) => w.some((y) => y.startsWith(x) || x.startsWith(y))).length / q.length;
    if (name.includes(query.toLowerCase().trim())) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 0.5 ? best : undefined;
}

function guessPriority(text: string): { priority: Priority; rest: string } {
  if (/\b(urgent|important|asap|high priority|!!)\b/i.test(text)) {
    return { priority: 'high', rest: text.replace(/\s*\b(urgent|important|asap|high priority)\b\s*/gi, ' ').replace(/!!/g, '').trim() };
  }
  if (/\b(low priority|whenever|someday)\b/i.test(text)) {
    return { priority: 'low', rest: text.replace(/\s*\b(low priority|whenever|someday)\b\s*/gi, ' ').trim() };
  }
  return { priority: 'medium', rest: text };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const HELP_TEXT = [
  'Here’s what I can do:',
  '• “Remind me to call mom tomorrow at 6pm”',
  '• “Add buy groceries this evening, urgent”',
  '• “What’s on today?” / “What’s next?” / “What’s tomorrow?”',
  '• “Done call mom” — I’ll tick it off',
  '• “Move dentist to friday” / “Delete gym”',
  '• “Move overdue to today”',
  '• “Plan my day” — I’ll suggest an order',
  '• “I did meditate” — logs a habit',
  '• “Focus 25” — starts a focus session',
  '• “Motivate me”',
  'Add an Anthropic API key in Settings and I’ll understand anything you say.',
].join('\n');

/** Rule-based Jarvis: understands common planning commands with no network. */
export function respond(input: string, ops: PlannerOps, settings: JarvisSettings, now = new Date()): JarvisReply {
  const text = input.trim();
  const lower = text.toLowerCase();
  const today = toISO(now);

  if (!text) return { text: 'I’m listening.' };

  if (/^(help|\?|what can you do|commands)\b/.test(lower)) return { text: HELP_TEXT };

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening)|brief|briefing|status|morning|how('?s| is) my day|update me|jarvis)\b/.test(lower)) {
    return { text: buildBriefing(ops, settings, now) };
  }

  if (/\b(motivat|inspire|encourag|i('?m| am) (tired|lazy|stuck|overwhelmed|stressed))/.test(lower)) {
    const open = ops.tasks.filter((t) => t.date === today && !t.done);
    const smallest = open.find((t) => t.priority === 'low') ?? open[0];
    return {
      text: `${pick(MOTIVATION)}${smallest ? ` Try knocking out “${smallest.title}” first — momentum is everything.` : ''} Say “focus” if you want me to time a ${settings.focusMinutes}-minute session.`,
    };
  }

  const focus = lower.match(/^(?:start\s+(?:a\s+)?)?(focus|pomodoro|deep work)(?:\s+(?:for\s+)?(\d{1,3}))?/);
  if (focus) {
    const minutes = focus[2] ? Math.min(180, Number(focus[2])) : settings.focusMinutes;
    return { text: `Starting a ${minutes}-minute focus session. I’ll let you know when it’s time for a break.`, effect: { type: 'focus', minutes } };
  }

  // Move all overdue to today
  if (/\b(move|bring|push|reschedule)\b.*\boverdue\b/.test(lower)) {
    const overdue = overdueTasks(ops.tasks, today);
    if (!overdue.length) return { text: 'Nothing is overdue. You’re all caught up.' };
    overdue.forEach((t) => ops.moveTask(t.id, today));
    return { text: `Done — moved ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'} to today:\n${bulletList(overdue)}` };
  }

  // Add / remind
  const add = text.match(/^(?:please\s+)?(?:jarvis,?\s+)?(remind me (?:to|about|of)?|add(?: a)?(?: task)?(?: to)?|create(?: a)? task|new task|todo:?|to-?do:?|schedule|i need to|i have to|i must|don'?t let me forget (?:to)?)\s+(.+)/i);
  if (add) {
    const isReminder = /^remind/i.test(add[1]);
    const when = parseWhen(add[2], now);
    const { priority, rest } = guessPriority(when.rest);
    const title = capitalize(
      rest
        .replace(/^(to|that|about)\s+/i, '')
        .replace(/\s+([,;:])/g, '$1')
        .replace(/[\s,;:.!?-]+$/, '')
        .trim(),
    );
    if (!title) return { text: 'What should I remind you about?' };
    const task = ops.addTask({
      title,
      date: when.date,
      time: when.time,
      priority,
      categoryId: null,
      remindMinutes: when.time ? (isReminder ? 0 : settings.defaultRemindMinutes) : null,
    });
    const day = when.date === today ? 'today' : when.date === addDays(today, 1) ? 'tomorrow' : formatLong(when.date);
    if (task.time) {
      const lead = task.remindMinutes ? `${task.remindMinutes} minutes before` : 'right on time';
      return { text: `Got it. “${task.title}” is set for ${day} at ${formatTime(task.time)}. I’ll remind you ${lead}.` };
    }
    return { text: `Added “${task.title}” to ${day}${priority === 'high' ? ' as high priority' : ''}. Give me a time if you want a reminder, e.g. “remind me to ${task.title.toLowerCase()} at 5pm”.` };
  }

  // Complete a task or log a habit
  const done = text.match(/^(?:i\s+)?(?:just\s+)?(?:done(?: with)?|finished|completed?|did|ticked off|check off|tick off|mark)\s+(.+?)(?:\s+(?:as\s+)?(?:done|complete|finished))?$/i);
  if (done) {
    const query = done[1];
    const habit = bestMatch(ops.habits.filter((h) => !h.archived), query, (h) => h.name);
    const openTasks = ops.tasks.filter((t) => !t.done && t.date <= addDays(today, 7));
    const task = bestMatch(openTasks, query, (t) => t.title);
    if (habit && (!task || /habit/i.test(text) || words(habit.name).join(' ') === words(query).join(' '))) {
      ops.toggleHabitDate(habit.id, today, true);
      const streak = currentStreak({ ...habit, completedDates: [...new Set([...habit.completedDates, today])] });
      return { text: `Logged “${habit.name}” for today. That’s a ${streak}-day streak${streak >= 3 ? ' 🔥' : ''}.` };
    }
    if (task) {
      ops.updateTask(task.id, { done: true });
      const left = ops.tasks.filter((t) => t.date === today && !t.done && t.id !== task.id);
      return { text: `Nice — “${task.title}” is done. ${left.length ? `${left.length} left today.` : 'That clears your list for today!'}` };
    }
    return { text: `I couldn’t find a task or habit matching “${query}”.` };
  }

  // Delete
  const del = text.match(/^(?:delete|remove|cancel|drop)\s+(?:the\s+)?(?:task\s+)?(.+)/i);
  if (del) {
    const task = bestMatch(ops.tasks.filter((t) => t.date >= addDays(today, -30)), del[1], (t) => t.title);
    if (!task) return { text: `I couldn’t find a task matching “${del[1]}”.` };
    ops.deleteTask(task.id);
    return { text: `Removed “${task.title}”.` };
  }

  // Move / reschedule
  const move = text.match(/^(?:move|push|postpone|reschedule|shift)\s+(.+?)\s+(?:to|until|till)\s+(.+)/i);
  if (move) {
    const task = bestMatch(ops.tasks.filter((t) => !t.done), move[1], (t) => t.title);
    if (!task) return { text: `I couldn’t find a task matching “${move[1]}”.` };
    const when = parseWhen(move[2], now);
    ops.updateTask(task.id, { date: when.date, ...(when.time ? { time: when.time } : {}) });
    return { text: `Moved “${task.title}” to ${when.date === today ? 'today' : formatLong(when.date)}${when.time ? ` at ${formatTime(when.time)}` : ''}.` };
  }

  // Queries
  if (/\b(what'?s|what is|show|list|anything)\b.*\bnext\b|^next\b/.test(lower)) {
    const next = nextTask(ops.tasks, now);
    return { text: next ? `Next up: ${describe(next)}.` : 'Nothing else on today’s list. Enjoy the breathing room.' };
  }
  if (/\boverdue|behind|missed\b/.test(lower)) {
    const overdue = overdueTasks(ops.tasks, today);
    return { text: overdue.length ? `Overdue:\n${bulletList(overdue)}\n\nSay “move overdue to today” to bring them forward.` : 'Nothing overdue. Nicely done.' };
  }
  if (/\btomorrow\b/.test(lower)) {
    const t = ops.tasks.filter((x) => x.date === addDays(today, 1));
    return { text: t.length ? `Tomorrow you have:\n${bulletList(t)}` : 'Tomorrow is wide open so far.' };
  }
  if (/\b(week|upcoming|coming up)\b/.test(lower)) {
    const end = addDays(today, 7);
    const t = ops.tasks.filter((x) => !x.done && x.date > today && x.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    if (!t.length) return { text: 'Nothing planned for the next 7 days yet.' };
    const byDay = new Map<string, Task[]>();
    t.forEach((x) => byDay.set(x.date, [...(byDay.get(x.date) ?? []), x]));
    return { text: `Coming up this week:\n${[...byDay].map(([d, list]) => `${formatLong(d)}\n${bulletList(list)}`).join('\n\n')}` };
  }
  if (/\bhabit/.test(lower)) {
    const active = ops.habits.filter((h) => !h.archived);
    if (!active.length) return { text: 'You aren’t tracking any habits yet. Add some in the Habits tab.' };
    return {
      text: `Your habits today:\n${active
        .map((h) => `• ${h.completedDates.includes(today) ? '✓' : '○'} ${h.name} — ${currentStreak(h)}-day streak`)
        .join('\n')}`,
    };
  }
  if (/\bplan\b.*\bday\b|\bprioriti[sz]e\b|\bwhat should i (do|work on)\b/.test(lower)) {
    const open = ops.tasks.filter((t) => t.date === today && !t.done);
    if (!open.length) return { text: 'Your list for today is empty. Tell me a few things you want to get done and I’ll add them.' };
    const scheduled = sortTasks(open.filter((t) => t.time));
    const flexible = open.filter((t) => !t.time).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const parts = ['Here’s how I’d run today:'];
    if (scheduled.length) parts.push(`Fixed appointments:\n${bulletList(scheduled)}`);
    if (flexible.length) parts.push(`In between, tackle these in order:\n${flexible.map((t, i) => `${i + 1}. ${t.title}${t.priority === 'high' ? ' (high priority)' : ''}`).join('\n')}`);
    parts.push('Do the hardest thing first while your energy is high.');
    return { text: parts.join('\n\n') };
  }
  if (/\b(today|my day|my tasks|to-?do|agenda|schedule)\b/.test(lower)) {
    const t = ops.tasks.filter((x) => x.date === today);
    return { text: t.length ? `Today:\n${bulletList(t)}` : 'Nothing on today’s list yet.' };
  }
  if (/\b(thank|thanks|cheers)\b/.test(lower)) return { text: pick(['Always a pleasure.', 'Any time.', 'Happy to help.']) };

  return {
    text: `I didn’t quite catch that. Try “remind me to … at 5pm”, “what’s on today?”, or “help”.${
      settings.apiKey ? '' : ' (Tip: add an API key in Settings to unlock full conversation.)'
    }`,
  };
}
