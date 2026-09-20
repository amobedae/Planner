import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { colorMap, colorOptions } from '../lib/colors';
import { usePlanner } from '../lib/PlannerContext';
import type { Priority, Task } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  editingTask?: Task | null;
};

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

export function TaskForm({ open, onClose, defaultDate, editingTask }: Props) {
  const { categories, addCategory, addTask, updateTask, deleteTask } = usePlanner();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [notes, setNotes] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDate(editingTask.date);
      setTime(editingTask.time ?? '');
      setPriority(editingTask.priority);
      setCategoryId(editingTask.categoryId);
      setNotes(editingTask.notes ?? '');
    } else {
      setTitle('');
      setDate(defaultDate);
      setTime('');
      setPriority('medium');
      setCategoryId(categories[0]?.id ?? null);
      setNotes('');
    }
    setCreatingCategory(false);
    setNewCategoryName('');
  }, [open, editingTask, defaultDate, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = { title, date, time: time || undefined, priority, categoryId, notes: notes || undefined };
    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    onClose();
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const color = colorOptions[categories.length % colorOptions.length];
    const category = addCategory(newCategoryName, color);
    setCategoryId(category.id);
    setNewCategoryName('');
    setCreatingCategory(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-paper-raised p-5 shadow-lift sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">
                {editingTask ? 'Edit task' : 'New task'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-ink-faint hover:bg-paper-sunken hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">What needs to get done?</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finish project proposal"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
              />
            </label>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">Time (optional)</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brand"
                />
              </label>
            </div>

            <div className="mb-4">
              <span className="mb-1 block text-xs font-medium text-ink-soft">Priority</span>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p.key}
                    onClick={() => setPriority(p.key)}
                    className={[
                      'flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors',
                      priority === p.key
                        ? 'border-brand bg-brand-soft text-brand-strong'
                        : 'border-line text-ink-soft hover:border-brand/50',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="block text-xs font-medium text-ink-soft">Category</span>
                <button
                  type="button"
                  onClick={() => setCreatingCategory((v) => !v)}
                  className="flex items-center gap-0.5 text-xs font-medium text-brand hover:underline"
                >
                  <Plus size={12} /> New
                </button>
              </div>
              {creatingCategory && (
                <div className="mb-2 flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-ink"
                  >
                    Add
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    categoryId === null ? 'border-ink text-ink' : 'border-line text-ink-faint hover:border-ink-faint',
                  ].join(' ')}
                >
                  None
                </button>
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={[
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      categoryId === c.id ? `${colorMap[c.color].border} ${colorMap[c.color].text}` : 'border-line text-ink-soft hover:border-ink-faint',
                    ].join(' ')}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${colorMap[c.color].dot}`} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any extra detail…"
                className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-ink shadow-soft transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                {editingTask ? 'Save changes' : 'Add task'}
              </button>
              {editingTask && (
                <button
                  type="button"
                  onClick={() => {
                    deleteTask(editingTask.id);
                    onClose();
                  }}
                  className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-danger hover:border-danger"
                >
                  Delete
                </button>
              )}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
