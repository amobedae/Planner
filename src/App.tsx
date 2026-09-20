import { useState } from 'react';
import { DayView } from './components/DayView';
import { Header } from './components/Header';
import { HabitsView } from './components/HabitsView';
import { Sidebar } from './components/Sidebar';
import { TaskForm } from './components/TaskForm';
import { WeekView } from './components/WeekView';
import { SearchResults } from './components/SearchResults';
import { PlannerProvider } from './lib/PlannerContext';
import { ThemeProvider } from './lib/ThemeContext';
import { todayISO } from './lib/date';
import type { Task, View } from './types';

function PlannerApp() {
  const [view, setView] = useState<View>('day');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formDate, setFormDate] = useState(todayISO());

  const openNewTaskForm = (date: string = selectedDate) => {
    setEditingTask(null);
    setFormDate(date);
    setFormOpen(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTask(task);
    setFormDate(task.date);
    setFormOpen(true);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    if (view === 'habits') setView('day');
  };

  return (
    <div className="flex min-h-svh bg-paper">
      <Sidebar
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-svh flex-1">
        <Header
          view={view}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          search={search}
          onSearchChange={setSearch}
          onMenuClick={() => setSidebarOpen(true)}
          onAddTask={() => openNewTaskForm()}
        />

        <main className="px-4 py-6 sm:px-8">
          {search.trim() ? (
            <SearchResults query={search} onEditTask={openEditTaskForm} />
          ) : view === 'day' ? (
            <DayView date={selectedDate} onEditTask={openEditTaskForm} onAddTask={() => openNewTaskForm()} />
          ) : view === 'week' ? (
            <WeekView
              selectedDate={selectedDate}
              onEditTask={openEditTaskForm}
              onAddTask={(date) => openNewTaskForm(date)}
              onSelectDay={(date, nextView) => {
                setSelectedDate(date);
                setView(nextView);
              }}
            />
          ) : (
            <HabitsView />
          )}
        </main>
      </div>

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} defaultDate={formDate} editingTask={editingTask} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <PlannerProvider>
        <PlannerApp />
      </PlannerProvider>
    </ThemeProvider>
  );
}

export default App;
