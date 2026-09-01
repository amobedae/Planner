import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePlanner } from '../lib/PlannerContext';
import {
  fromISO,
  formatMonthYear,
  isSameDay,
  isSameMonth,
  isToday,
  monthGrid,
  toISO,
  todayISO,
} from '../lib/date';

type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MiniCalendar({ selectedDate, onSelect }: Props) {
  const { tasks } = usePlanner();
  const [cursor, setCursor] = useState(() => toISO(new Date(fromISO(selectedDate).getFullYear(), fromISO(selectedDate).getMonth(), 1)));

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const taskDates = useMemo(() => new Set(tasks.filter((t) => !t.done).map((t) => t.date)), [tasks]);

  const shiftMonth = (amount: number) => {
    const d = fromISO(cursor);
    setCursor(toISO(new Date(d.getFullYear(), d.getMonth() + amount, 1)));
  };

  return (
    <div>
      <div className="flex items-center justify-between px-0.5 pb-2">
        <span className="font-display text-sm font-medium text-ink">{formatMonthYear(cursor)}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={`${w}-${i}`} className="text-[10px] font-medium text-ink-faint">
            {w}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasTasks = taskDates.has(day);
          return (
            <button
              key={day}
              onClick={() => onSelect(day)}
              className={[
                'relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors',
                !inMonth && 'text-ink-faint/50',
                inMonth && !selected && 'text-ink-soft hover:bg-paper-sunken',
                selected && 'bg-brand font-semibold text-brand-ink',
                !selected && today && 'font-semibold text-brand',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day.slice(-2).replace(/^0/, '')}
              {hasTasks && !selected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSelect(todayISO())}
        className="mt-3 w-full rounded-lg border border-line py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
      >
        Jump to today
      </button>
    </div>
  );
}
