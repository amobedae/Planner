import { Flame, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { colorMap, colorOptions } from '../lib/colors';
import { addDays, todayISO } from '../lib/date';
import { usePlanner } from '../lib/PlannerContext';
import type { CategoryColor, Habit } from '../types';

const GRID_DAYS = 35;

function currentStreak(habit: Habit): number {
  const done = new Set(habit.completedDates);
  let streak = 0;
  let cursor = todayISO();
  if (!done.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!done.has(cursor)) return 0;
  }
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function HabitsView() {
  const { habits, addHabit, deleteHabit, toggleHabitDate } = usePlanner();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<CategoryColor>('brand');

  const days = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: GRID_DAYS }, (_, i) => addDays(today, i - (GRID_DAYS - 1)));
  }, []);

  const handleAdd = () => {
    if (!name.trim()) return;
    addHabit(name, color);
    setName('');
    setColor('brand');
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {habits.length === 0 && !adding && (
        <div className="paper-texture flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg font-medium text-ink">Start a streak</p>
          <p className="mt-1 max-w-xs text-sm text-ink-faint">
            Track daily habits and watch your consistency build over time.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-ink shadow-soft transition-transform hover:scale-[1.03]"
          >
            Add your first habit
          </button>
        </div>
      )}

      {habits.map((habit) => {
        const tokens = colorMap[habit.color];
        const streak = currentStreak(habit);
        const doneSet = new Set(habit.completedDates);

        return (
          <div key={habit.id} className="rounded-2xl border border-line bg-paper-raised p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${tokens.dot}`} />
                <h3 className="font-medium text-ink">{habit.name}</h3>
                {streak > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-paper-sunken px-2 py-0.5 text-xs font-medium text-amber">
                    <Flame size={12} />
                    {streak} day{streak === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteHabit(habit.id)}
                className="rounded-md p-1.5 text-ink-faint hover:bg-paper-sunken hover:text-danger"
                aria-label={`Delete ${habit.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] gap-1">
              {days.map((day) => {
                const done = doneSet.has(day);
                const isFuture = day > todayISO();
                return (
                  <button
                    key={day}
                    disabled={isFuture}
                    onClick={() => toggleHabitDate(habit.id, day)}
                    title={day}
                    className={[
                      'aspect-square w-full rounded-[3px] transition-colors',
                      isFuture ? 'cursor-not-allowed bg-paper-sunken/40' : done ? tokens.bar : 'bg-paper-sunken hover:opacity-70',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-2xl border border-line bg-paper-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">New habit</h3>
            <button
              onClick={() => setAdding(false)}
              className="rounded-md p-1 text-ink-faint hover:bg-paper-sunken hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Meditate for 10 minutes"
            className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
          />
          <div className="mb-4 flex gap-2">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={[
                  'h-6 w-6 rounded-full transition-transform',
                  colorMap[c].dot,
                  color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-paper-raised' : '',
                  color === c ? colorMap[c].ring : '',
                ].join(' ')}
                aria-label={c}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-ink shadow-soft"
          >
            Add habit
          </button>
        </div>
      ) : (
        habits.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-ink-faint transition-colors hover:border-brand hover:text-brand"
          >
            <Plus size={15} /> Add another habit
          </button>
        )
      )}
    </div>
  );
}
