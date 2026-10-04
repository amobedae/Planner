import { CalendarDays, LayoutGrid, Moon, Settings, Sparkles, Sun, Target, X } from 'lucide-react';
import { JarvisOrb } from './JarvisOrb';
import { usePlanner } from '../lib/PlannerContext';
import { todayISO } from '../lib/date';
import { useTheme } from '../lib/ThemeContext';
import type { View } from '../types';
import { MiniCalendar } from './MiniCalendar';
import { ProgressRing } from './ProgressRing';

type Props = {
  view: View;
  onViewChange: (view: View) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  open: boolean;
  onClose: () => void;
};

export const NAV_ITEMS: { key: View; label: string; icon: typeof CalendarDays }[] = [
  { key: 'jarvis', label: 'Jarvis', icon: Sparkles },
  { key: 'day', label: 'Day', icon: CalendarDays },
  { key: 'week', label: 'Week', icon: LayoutGrid },
  { key: 'habits', label: 'Habits', icon: Target },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ view, onViewChange, selectedDate, onSelectDate, open, onClose }: Props) {
  const { tasks } = usePlanner();
  const { theme, toggleTheme } = useTheme();

  const today = todayISO();
  const todaysTasks = tasks.filter((t) => t.date === today);
  const done = todaysTasks.filter((t) => t.done).length;
  const progress = todaysTasks.length ? done / todaysTasks.length : 0;

  return (
    <>
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-paper-raised p-5 pt-[max(1.25rem,env(safe-area-inset-top))] transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <JarvisOrb size={32} />
            <span className="font-display text-xl font-semibold tracking-tight text-ink">Jarvis</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint hover:bg-paper-sunken hover:text-ink lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                onViewChange(key);
                onClose();
              }}
              className={[
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                view === key
                  ? 'bg-brand-soft text-brand-strong'
                  : 'text-ink-soft hover:bg-paper-sunken hover:text-ink',
              ].join(' ')}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6 rounded-xl border border-line bg-paper p-3">
          <MiniCalendar selectedDate={selectedDate} onSelect={onSelectDate} />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
          <ProgressRing value={progress} size={52} strokeWidth={5} />
          <div>
            <p className="text-sm font-medium text-ink">Today's progress</p>
            <p className="text-xs text-ink-faint">
              {done} of {todaysTasks.length} task{todaysTasks.length === 1 ? '' : 's'} done
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
