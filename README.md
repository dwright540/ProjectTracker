# Project Tracker

A lightweight website for tracking progress on the projects I work on at CDS.

## Features
- **Dashboard**: totals, in progress, completed, blocked/on hold, overdue, and average progress.
- **Projects** have a status, priority, start/due dates, a department/area, tags, and a description.
- **Tasks and milestones**: a checklist per project. Progress is calculated from completed tasks, or set by hand when a project has no tasks.
- **Hours**: set an estimated total hours on each project, then log the hours you worked on a given day. Cards and the project view show hours logged against the estimate (remaining, or over).
- **Time log**: a page listing every day you logged hours, with daily totals, a by-project breakdown, and a filter for this week, last week, this month, or all time. You can also log hours from there.
- **Progress log**: dated notes on what got done and any blockers. Status changes and completed tasks are logged automatically.
- **Search, filter, and sort** by status, priority, due date, progress, or name.
- **Export / Import**: back up all projects to a JSON file or restore from one.

## Running it
No build step or server is needed. Open `index.html` in a browser, or host it with GitHub Pages
(Settings → Pages → Deploy from branch → `main` / root).

## Where data is stored
Data is saved in your browser's `localStorage`. It stays on your machine and is **not** uploaded anywhere,
including GitHub. Each browser/computer keeps its own copy, so use **Export** regularly to back up, and
**Import** to move your data to another machine.
