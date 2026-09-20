import { Plus } from 'lucide-react';
import { usePlanner } from '../lib/PlannerContext';
import { formatDayLabel, formatDayNumber, isToday, weekDays } from '../lib/date';
import type { Task, View } from '../types';

type Props = {
  selectedDate: string;
  onEditTask: (task: Task) => void;
  onAddTask: (date: string) => void;
  onSelectDay: (date: string, view: View) => void;
};

export function WeekView({ selectedDate, onEditTask, onAddTask, onSelectDay }: Props) {
  const { tasks } = usePlanner();
  const days = weekDays(selectedDate);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const dayTasks = tasks
          .filter((t) => t.date === day)
          .sort((a, b) => {
            if (!!a.time !== !!b.time) return a.time ? -1 : 1;
            if (a.time && b.time) return a.time.localeCompare(b.time);
            return a.createdAt - b.createdAt;
          });
        const done = dayTasks.filter((t) => t.done).length;
        const today = isToday(day);

        return (
          <div
            key={day}
            className={[
              'flex min-h-[220px] flex-col rounded-2xl border bg-paper-raised p-3',
              today ? 'border-brand' : 'border-line',
            ].join(' ')}
          >
            <button
              onClick={() => onSelectDay(day, 'day')}
              className="mb-2 flex items-center justify-between text-left"
            >
              <div>
                <p className={['text-xs font-semibold uppercase tracking-wide', today ? 'text-brand' : 'text-ink-faint'].join(' ')}>
                  {formatDayLabel(day)}
                </p>
                <p className={['font-display text-lg font-semibold', today ? 'text-brand' : 'text-ink'].join(' ')}>
                  {formatDayNumber(day)}
                </p>
              </div>
              {dayTasks.length > 0 && (
                <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[10px] font-medium text-ink-faint">
                  {done}/{dayTasks.length}
                </span>
              )}
            </button>

            <div className="flex-1 space-y-1.5">
              {dayTasks.length === 0 ? (
                <p className="pt-2 text-center text-xs text-ink-faint">No tasks</p>
              ) : (
                dayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className={[
                      'flex w-full items-center gap-1.5 rounded-lg border border-line-soft bg-paper px-2 py-1.5 text-left text-xs text-ink transition-colors hover:border-brand',
                      task.done && 'opacity-50',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        task.done ? 'bg-brand' : 'bg-ink-faint',
                      ].join(' ')}
                    />
                    <span className={['truncate', task.done && 'line-through'].join(' ')}>{task.title}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => onAddTask(day)}
              className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-xs font-medium text-ink-faint transition-colors hover:border-brand hover:text-brand"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        );
      })}
    </div>
  );
}
