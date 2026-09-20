import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_CATEGORIES, seedHabits, seedNotes, seedTasks } from '../data/seed';
import type { Category, DailyNote, Habit, Priority, Task } from '../types';
import { todayISO } from './date';
import { createId } from './id';
import { useLocalStorage } from './storage';

type NewTaskInput = {
  title: string;
  date: string;
  time?: string;
  priority: Priority;
  categoryId: string | null;
  notes?: string;
};

type PlannerContextValue = {
  tasks: Task[];
  notes: DailyNote[];
  habits: Habit[];
  categories: Category[];
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, date: string) => void;
  setNote: (date: string, content: string) => void;
  getNote: (date: string) => string;
  addCategory: (name: string, color: Category['color']) => Category;
  addHabit: (name: string, color: Category['color']) => void;
  deleteHabit: (id: string) => void;
  toggleHabitDate: (id: string, date: string) => void;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('daylight.tasks', seedTasks);
  const [notes, setNotes] = useLocalStorage<DailyNote[]>('daylight.notes', seedNotes);
  const [habits, setHabits] = useLocalStorage<Habit[]>('daylight.habits', seedHabits);
  const [categories, setCategories] = useLocalStorage<Category[]>(
    'daylight.categories',
    DEFAULT_CATEGORIES,
  );

  const value = useMemo<PlannerContextValue>(
    () => ({
      tasks,
      notes,
      habits,
      categories,

      addTask: (input) => {
        const task: Task = {
          id: createId(),
          title: input.title.trim(),
          date: input.date,
          time: input.time,
          priority: input.priority,
          categoryId: input.categoryId,
          done: false,
          notes: input.notes,
          createdAt: Date.now(),
        };
        setTasks((prev) => [...prev, task]);
      },

      updateTask: (id, patch) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      },

      toggleTask: (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      },

      deleteTask: (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      },

      moveTask: (id, date) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date } : t)));
      },

      setNote: (date, content) => {
        setNotes((prev) => {
          const exists = prev.some((n) => n.date === date);
          if (exists) return prev.map((n) => (n.date === date ? { ...n, content } : n));
          return [...prev, { date, content }];
        });
      },

      getNote: (date) => notes.find((n) => n.date === date)?.content ?? '',

      addCategory: (name, color) => {
        const category: Category = { id: createId(), name: name.trim(), color };
        setCategories((prev) => [...prev, category]);
        return category;
      },

      addHabit: (name, color) => {
        const habit: Habit = {
          id: createId(),
          name: name.trim(),
          color,
          createdAt: Date.now(),
          completedDates: [],
        };
        setHabits((prev) => [...prev, habit]);
      },

      deleteHabit: (id) => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
      },

      toggleHabitDate: (id, date) => {
        setHabits((prev) =>
          prev.map((h) => {
            if (h.id !== id) return h;
            const has = h.completedDates.includes(date);
            return {
              ...h,
              completedDates: has
                ? h.completedDates.filter((d) => d !== date)
                : [...h.completedDates, date],
            };
          }),
        );
      },
    }),
    [tasks, notes, habits, categories, setTasks, setNotes, setHabits, setCategories],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}

export function useTasksForDate(date: string): Task[] {
  const { tasks } = usePlanner();
  return useMemo(
    () =>
      tasks
        .filter((t) => t.date === date)
        .sort((a, b) => {
          if (!!a.time !== !!b.time) return a.time ? -1 : 1;
          if (a.time && b.time) return a.time.localeCompare(b.time);
          return a.createdAt - b.createdAt;
        }),
    [tasks, date],
  );
}

export { todayISO };
