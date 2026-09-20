import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { useMemo } from 'react';
import { useTasksForDate } from '../lib/PlannerContext';
import type { Task } from '../types';
import { NotesPanel } from './NotesPanel';
import { TaskItem } from './TaskItem';

type Props = {
  date: string;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
};

export function DayView({ date, onEditTask, onAddTask }: Props) {
  const tasks = useTasksForDate(date);

  const scheduled = useMemo(() => tasks.filter((t) => t.time), [tasks]);
  const anytime = useMemo(() => tasks.filter((t) => !t.time), [tasks]);
  const allDone = tasks.length > 0 && tasks.every((t) => t.done);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {tasks.length === 0 ? (
          <EmptyState onAddTask={onAddTask} />
        ) : (
          <>
            {allDone && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm font-medium text-brand-strong">
                <PartyPopper size={16} />
                All done for today. Nice work!
              </div>
            )}
            {scheduled.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Scheduled</h3>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {scheduled.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                      >
                        <TaskItem task={task} onEdit={onEditTask} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {anytime.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Anytime</h3>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {anytime.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                      >
                        <TaskItem task={task} onEdit={onEditTask} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <div className="space-y-6">
        <NotesPanel date={date} />
      </div>
    </div>
  );
}

function EmptyState({ onAddTask }: { onAddTask: () => void }) {
  return (
    <div className="paper-texture flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
      <p className="font-display text-lg font-medium text-ink">A clean page</p>
      <p className="mt-1 max-w-xs text-sm text-ink-faint">
        Nothing planned yet for this day. Add your first task to get started.
      </p>
      <button
        onClick={onAddTask}
        className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-ink shadow-soft transition-transform hover:scale-[1.03]"
      >
        Add a task
      </button>
    </div>
  );
}
