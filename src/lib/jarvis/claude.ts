import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import type { ChatMessage, JarvisSettings, Task } from '../../types';
import { currentStreak } from '../../components/HabitsView';
import { addDays, toISO } from '../date';
import type { JarvisReply, PlannerOps } from './brain';

const MODEL = 'claude-opus-5-5';

const SYSTEM_PROMPT = `You are Jarvis, a warm, sharp and concise personal assistant living inside the user's planner app on their phone.
Your job: keep the user on top of their day. Remind them what to do, help them plan, add and update tasks and reminders, track habits, and keep them motivated.

How to behave:
- Reply in plain text (no markdown headings or tables). Keep answers short — usually 1–4 sentences, or a short bullet list using "•".
- When the user asks you to remember, remind, schedule, add, move, finish or delete something, use the tools to actually do it, then confirm briefly with the day and time.
- Resolve relative dates ("tomorrow", "next Friday", "in 2 hours") using the current date and time given in the context. Use 24h HH:mm for tool times.
- A task with a time gets a reminder notification; set remind_minutes to 0 for "remind me at X", otherwise use the user's default unless they ask for something else.
- If a request is ambiguous (e.g. several tasks match), ask a quick question instead of guessing.
- You can give general advice (productivity, wellbeing, quick facts), but stay brief and practical.`;

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: 'add_task',
    description: 'Add a task (optionally with a time and reminder) to the planner.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'date', 'time', 'priority', 'remind_minutes', 'notes'],
      properties: {
        title: { type: 'string', description: 'Short task title, e.g. "Call mom"' },
        date: { type: 'string', description: 'yyyy-MM-dd' },
        time: { type: ['string', 'null'], description: 'HH:mm 24h, or null for an anytime task' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        remind_minutes: { type: ['integer', 'null'], description: 'Minutes before time to notify (0 = at the time). null = no reminder.' },
        notes: { type: ['string', 'null'] },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Change an existing task: mark done/undone, reschedule, rename, change priority or reminder. Pass null for fields that should not change.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'done', 'title', 'date', 'time', 'priority', 'remind_minutes'],
      properties: {
        id: { type: 'string' },
        done: { type: ['boolean', 'null'] },
        title: { type: ['string', 'null'] },
        date: { type: ['string', 'null'], description: 'yyyy-MM-dd' },
        time: { type: ['string', 'null'], description: 'HH:mm, or "none" to clear the time' },
        priority: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
        remind_minutes: { type: ['integer', 'null'], description: '-1 clears the reminder' },
      },
    },
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task.',
    strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'log_habit',
    description: 'Mark a habit as done (or not done) for a date.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'date', 'done'],
      properties: { id: { type: 'string' }, date: { type: 'string', description: 'yyyy-MM-dd' }, done: { type: 'boolean' } },
    },
  },
  {
    name: 'start_focus_timer',
    description: 'Start a focus (pomodoro) timer in the app.',
    strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['minutes'], properties: { minutes: { type: 'integer' } } },
  },
];

function taskLine(t: Task) {
  return `- [${t.done ? 'x' : ' '}] id=${t.id} | ${t.date}${t.time ? ` ${t.time}` : ''} | ${t.title} | ${t.priority}${t.remindMinutes != null && t.time ? ` | remind ${t.remindMinutes}m before` : ''}${t.notes ? ` | notes: ${t.notes}` : ''}`;
}

function buildContext(ops: PlannerOps, settings: JarvisSettings, now: Date): string {
  const today = toISO(now);
  const from = addDays(today, -14);
  const to = addDays(today, 30);
  const relevant = ops.tasks
    .filter((t) => (t.date >= today && t.date <= to) || (!t.done && t.date >= from && t.date < today))
    .sort((a, b) => (a.date + (a.time ?? '99')).localeCompare(b.date + (b.time ?? '99')))
    .slice(0, 150);
  const habits = ops.habits.filter((h) => !h.archived);
  return [
    `<context>`,
    `Now: ${format(now, "EEEE yyyy-MM-dd HH:mm")}`,
    `User's name: ${settings.userName || '(not set)'}`,
    `Default reminder: ${settings.defaultRemindMinutes} minutes before`,
    `Tasks (overdue + next 30 days):`,
    relevant.length ? relevant.map(taskLine).join('\n') : '(none)',
    `Habits:`,
    habits.length
      ? habits.map((h) => `- id=${h.id} | ${h.name} | done today: ${h.completedDates.includes(today) ? 'yes' : 'no'} | streak ${currentStreak(h)}`).join('\n')
      : '(none)',
    `</context>`,
  ].join('\n');
}

type ToolInput = Record<string, unknown>;

function runTool(name: string, input: ToolInput, ops: PlannerOps, effects: JarvisReply['effect'][]): string {
  switch (name) {
    case 'add_task': {
      const task = ops.addTask({
        title: String(input.title),
        date: String(input.date),
        time: (input.time as string | null) ?? undefined,
        priority: (input.priority as Task['priority']) ?? 'medium',
        categoryId: null,
        notes: (input.notes as string | null) ?? undefined,
        remindMinutes: input.time ? ((input.remind_minutes as number | null) ?? null) : null,
      });
      return `Added task id=${task.id}`;
    }
    case 'update_task': {
      const id = String(input.id);
      if (!ops.tasks.some((t) => t.id === id)) return `Error: no task with id ${id}`;
      const patch: Partial<Task> = {};
      if (input.done != null) patch.done = Boolean(input.done);
      if (input.title != null) patch.title = String(input.title);
      if (input.date != null) patch.date = String(input.date);
      if (input.time != null) patch.time = input.time === 'none' ? undefined : String(input.time);
      if (input.priority != null) patch.priority = input.priority as Task['priority'];
      if (input.remind_minutes != null) patch.remindMinutes = Number(input.remind_minutes) < 0 ? null : Number(input.remind_minutes);
      ops.updateTask(id, patch);
      return 'Updated';
    }
    case 'delete_task': {
      const id = String(input.id);
      if (!ops.tasks.some((t) => t.id === id)) return `Error: no task with id ${id}`;
      ops.deleteTask(id);
      return 'Deleted';
    }
    case 'log_habit': {
      const id = String(input.id);
      if (!ops.habits.some((h) => h.id === id)) return `Error: no habit with id ${id}`;
      ops.toggleHabitDate(id, String(input.date), Boolean(input.done));
      return 'Logged';
    }
    case 'start_focus_timer': {
      const minutes = Math.max(1, Math.min(180, Number(input.minutes) || 25));
      effects.push({ type: 'focus', minutes });
      return `Timer started for ${minutes} minutes`;
    }
    default:
      return `Error: unknown tool ${name}`;
  }
}

/** Keep the planner snapshot current while tools run within one turn. */
function trackingOps(ops: PlannerOps): PlannerOps {
  const live: PlannerOps = {
    ...ops,
    tasks: [...ops.tasks],
    habits: [...ops.habits],
    addTask: (input) => {
      const task = ops.addTask(input);
      live.tasks.push(task);
      return task;
    },
    updateTask: (id, patch) => {
      ops.updateTask(id, patch);
      live.tasks = live.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    },
    deleteTask: (id) => {
      ops.deleteTask(id);
      live.tasks = live.tasks.filter((t) => t.id !== id);
    },
  };
  return live;
}

export class JarvisAIError extends Error {}

export async function askClaude(
  userText: string,
  history: ChatMessage[],
  baseOps: PlannerOps,
  settings: JarvisSettings,
  now = new Date(),
): Promise<JarvisReply> {
  const client = new Anthropic({ apiKey: settings.apiKey.trim(), dangerouslyAllowBrowser: true });
  const ops = trackingOps(baseOps);
  const effects: JarvisReply['effect'][] = [];

  // Prior chat as plain text turns (must start with a user turn).
  const prior: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history.slice(-20)) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    if (!prior.length && role !== 'user') continue;
    prior.push({ role, content: m.text });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...prior,
    {
      role: 'user',
      content: [
        { type: 'text', text: buildContext(ops, settings, now) },
        { type: 'text', text: userText },
      ],
    },
  ];

  try {
    for (let i = 0; i < 6; i++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools,
        messages,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });

      if (response.stop_reason === 'refusal') {
        return { text: 'Sorry, I can’t help with that one.' };
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || !toolUses.length) {
        const text = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return { text: text || 'Done.', effect: effects[0] };
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((tu) => {
        let content: string;
        try {
          content = runTool(tu.name, tu.input as ToolInput, ops, effects);
        } catch (err) {
          content = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        return { type: 'tool_result', tool_use_id: tu.id, content, is_error: content.startsWith('Error') };
      });
      messages.push({ role: 'user', content: results });
    }
    return { text: 'All done.', effect: effects[0] };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new JarvisAIError('Your Anthropic API key was rejected. Check it in Settings.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new JarvisAIError('I’m being rate-limited right now. Try again in a moment.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new JarvisAIError('offline');
    }
    if (error instanceof Anthropic.APIError) {
      throw new JarvisAIError(`The AI service returned an error (${error.status ?? 'unknown'}).`);
    }
    throw error;
  }
}
