import { ChevronLeft, ChevronRight, Menu, Plus, Search, X } from 'lucide-react';
import { addDays, formatLong, formatMonthYear, formatWeekRange, isToday, todayISO, weekDays } from '../lib/date';
import type { View } from '../types';

type Props = {
  view: View;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onMenuClick: () => void;
  onAddTask: () => void;
};

export function Header({ view, selectedDate, onSelectDate, search, onSearchChange, onMenuClick, onAddTask }: Props) {
  const step = view === 'week' ? 7 : 1;

  const title = () => {
    if (view === 'jarvis') return 'Jarvis';
    if (view === 'settings') return 'Settings';
    if (view === 'habits') return 'Habits & goals';
    if (view === 'week') {
      const days = weekDays(selectedDate);
      return formatWeekRange(days[0], days[6]);
    }
    return isToday(selectedDate) ? 'Today' : formatLong(selectedDate);
  };

  const subtitle = () => {
    if (view === 'jarvis') return formatLong(todayISO());
    if (view === 'settings') return 'Make Jarvis yours';
    if (view === 'habits') return 'Build streaks that stick';
    if (view === 'week') return 'This week';
    return formatMonthYear(selectedDate);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-8 sm:pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg border border-line p-2 text-ink-soft hover:border-brand hover:text-brand lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title()}</h1>
            <p className="text-xs text-ink-faint sm:text-sm">{subtitle()}</p>
          </div>
          {(view === 'day' || view === 'week') && (
            <div className="ml-1 flex items-center gap-1">
              <button
                onClick={() => onSelectDate(addDays(selectedDate, -step))}
                className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => onSelectDate(addDays(selectedDate, step))}
                className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
              {!isToday(selectedDate) && view === 'day' && (
                <button
                  onClick={() => onSelectDate(todayISO())}
                  className="ml-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand"
                >
                  Today
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {view !== 'jarvis' && view !== 'settings' && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks…"
              className="w-40 rounded-full border border-line bg-paper-raised py-2 pl-8 pr-7 text-sm text-ink placeholder:text-ink-faint focus:border-brand sm:w-56"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          )}
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-ink shadow-soft transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
