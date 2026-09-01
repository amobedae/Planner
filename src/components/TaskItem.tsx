import { Check, Clock } from 'lucide-react';
import { colorMap, priorityTokens } from '../lib/colors';
import { usePlanner } from '../lib/PlannerContext';
import type { Task } from '../types';

type Props = {
  task: Task;
  onEdit: (task: Task) => void;
  showDate?: boolean;
};

export function TaskItem({ task, onEdit }: Props) {
  const { categories, toggleTask } = usePlanner();
  const category = categories.find((c) => c.id === task.categoryId);

  return (
    <div
      className={[
        'group flex items-start gap-3 rounded-xl border border-line bg-paper-raised p-3 transition-all hover:shadow-soft',
        task.done && 'opacity-60',
      ].join(' ')}
    >
      <button
        onClick={() => toggleTask(task.id)}
        aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.done ? 'border-brand bg-brand text-brand-ink' : 'border-line-soft hover:border-brand',
        ].join(' ')}
      >
        {task.done && <Check size={12} strokeWidth={3} className="animate-check" />}
      </button>

      <button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
        <p className={['truncate text-sm font-medium text-ink', task.done && 'line-through decoration-ink-faint'].join(' ')}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          {task.time && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {task.time}
            </span>
          )}
          {category && (
            <span className={`flex items-center gap-1 font-medium ${colorMap[category.color].text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${colorMap[category.color].dot}`} />
              {category.name}
            </span>
          )}
          <span className={`flex items-center gap-1 font-medium ${priorityTokens[task.priority].text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${priorityTokens[task.priority].dot}`} />
            {priorityTokens[task.priority].label}
          </span>
        </div>
        {task.notes && <p className="mt-1 truncate text-xs text-ink-faint">{task.notes}</p>}
      </button>
    </div>
  );
}
