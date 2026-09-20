export type Priority = 'low' | 'medium' | 'high';

export type Category = {
  id: string;
  name: string;
  color: CategoryColor;
};

export type CategoryColor = 'brand' | 'coral' | 'amber' | 'moss' | 'sky' | 'plum';

export type Task = {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm, optional
  priority: Priority;
  categoryId: string | null;
  done: boolean;
  notes?: string;
  createdAt: number;
};

export type DailyNote = {
  date: string; // yyyy-MM-dd
  content: string;
};

export type Habit = {
  id: string;
  name: string;
  color: CategoryColor;
  createdAt: number;
  completedDates: string[]; // yyyy-MM-dd[]
  archived?: boolean;
};

export type PlannerData = {
  tasks: Task[];
  notes: DailyNote[];
  habits: Habit[];
  categories: Category[];
};

export type View = 'day' | 'week' | 'habits';
