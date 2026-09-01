# Daylight — Personal Planner

A fast, good-looking daily planner you run locally and can freely reshape.
Built with React, TypeScript, Vite, and Tailwind CSS v4. All data is saved
in your browser's `localStorage` — nothing leaves your machine.

## Features

- **Day view** — scheduled and "anytime" tasks, a notes box for the day, a
  progress ring.
- **Week view** — a 7-day board for planning at a glance, with quick-add per
  day.
- **Habits view** — build daily habits with a streak grid and current-streak
  counter.
- **Tasks** — title, date, optional time, priority, category (with your own
  custom categories/colors), and notes. Search across all tasks from the
  header.
- **Light & dark themes**, following your system preference by default, with
  a manual toggle that's remembered.
- **Fully responsive** — a collapsible sidebar on mobile.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run build` — type-check and build for production into `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run oxlint

## Project structure

```
src/
  components/     UI components (views, forms, calendar, sidebar, header…)
  lib/            State (PlannerContext, ThemeContext), date/color/id helpers
  data/seed.ts    First-run sample data
  types.ts        Shared TypeScript types
```

State lives in `src/lib/PlannerContext.tsx`, a React context backed by
`useLocalStorage` (`src/lib/storage.ts`). All reads/writes to tasks, notes,
habits, and categories go through it — that's the one file to know for
adding new data-driven features.

## Making it yours

- **Colors & fonts** — edit the CSS variables and `@theme` block in
  `src/index.css`. Every color (`brand`, `coral`, `amber`, `moss`, `sky`,
  `plum`) is defined once for light and once for dark mode.
- **Default categories** — edit `DEFAULT_CATEGORIES` in `src/data/seed.ts`.
- **New views** — add an entry to `NAV_ITEMS` in `src/components/Sidebar.tsx`
  and a case in the view switch in `src/App.tsx`.
- **Data model** — extend `Task`, `Habit`, etc. in `src/types.ts`, then wire
  up the corresponding action in `PlannerContext.tsx`.

No backend, no build config beyond Vite's defaults — clone it, tweak it, and
it's yours.
