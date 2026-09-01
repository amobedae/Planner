import { addDays, todayISO } from '../lib/date';
import { createId } from '../lib/id';
import type { Category, DailyNote, Habit, Task } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: 'brand' },
  { id: 'personal', name: 'Personal', color: 'coral' },
  { id: 'health', name: 'Health', color: 'moss' },
  { id: 'learning', name: 'Learning', color: 'sky' },
  { id: 'errands', name: 'Errands', color: 'amber' },
];

export function seedTasks(): Task[] {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  return [
    {
      id: createId(),
      title: 'Plan out the week ahead',
      date: today,
      time: '08:30',
      priority: 'high',
      categoryId: 'work',
      done: false,
      createdAt: Date.now() - 6000,
    },
    {
      id: createId(),
      title: 'Morning walk',
      date: today,
      time: '07:00',
      priority: 'medium',
      categoryId: 'health',
      done: true,
      createdAt: Date.now() - 5000,
    },
    {
      id: createId(),
      title: 'Reply to important emails',
      date: today,
      time: '10:00',
      priority: 'medium',
      categoryId: 'work',
      done: false,
      createdAt: Date.now() - 4000,
    },
    {
      id: createId(),
      title: 'Read for 20 minutes',
      date: today,
      priority: 'low',
      categoryId: 'learning',
      done: false,
      notes: 'Currently reading: Atomic Habits',
      createdAt: Date.now() - 3000,
    },
    {
      id: createId(),
      title: 'Grocery run',
      date: tomorrow,
      time: '17:30',
      priority: 'low',
      categoryId: 'errands',
      done: false,
      createdAt: Date.now() - 2000,
    },
    {
      id: createId(),
      title: 'Team sync',
      date: tomorrow,
      time: '11:00',
      priority: 'high',
      categoryId: 'work',
      done: false,
      createdAt: Date.now() - 1000,
    },
    {
      id: createId(),
      title: 'Call mom',
      date: yesterday,
      priority: 'medium',
      categoryId: 'personal',
      done: true,
      createdAt: Date.now() - 500,
    },
  ];
}

export function seedNotes(): DailyNote[] {
  const today = todayISO();
  return [
    {
      date: today,
      content: 'Welcome to Daylight! ✨ This is your notes space — jot down thoughts, wins, or a gratitude line for the day.',
    },
  ];
}

export function seedHabits(): Habit[] {
  const today = todayISO();
  const dates = (count: number) => Array.from({ length: count }, (_, i) => addDays(today, -i));

  return [
    {
      id: createId(),
      name: 'Drink water',
      color: 'sky',
      createdAt: Date.now() - 3000,
      completedDates: dates(4),
    },
    {
      id: createId(),
      name: 'Move my body',
      color: 'moss',
      createdAt: Date.now() - 2000,
      completedDates: dates(2),
    },
    {
      id: createId(),
      name: 'No phone before bed',
      color: 'plum',
      createdAt: Date.now() - 1000,
      completedDates: dates(1),
    },
  ];
}
