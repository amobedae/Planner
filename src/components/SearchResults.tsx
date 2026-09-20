import { useMemo } from 'react';
import { formatLong } from '../lib/date';
import { usePlanner } from '../lib/PlannerContext';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type Props = {
  query: string;
  onEditTask: (task: Task) => void;
};

export function SearchResults({ query, onEditTask }: Props) {
  const { tasks } = usePlanner();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
      .sort((a, b) => a.date.localeCompare(b.date));
    return matches.map((task, i) => ({ task, showDateHeader: i === 0 || matches[i - 1].date !== task.date }));
  }, [tasks, query]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg font-medium text-ink">No matches</p>
        <p className="mt-1 text-sm text-ink-faint">Nothing found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {results.map(({ task, showDateHeader }) => (
        <div key={task.id}>
          {showDateHeader && (
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {formatLong(task.date)}
            </h3>
          )}
          <TaskItem task={task} onEdit={onEditTask} />
        </div>
      ))}
    </div>
  );
}
