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
By default, data is saved in your browser's `localStorage`. It stays on your machine and is **not** uploaded
anywhere, including GitHub. Each browser/computer keeps its own copy, so use **Export** regularly to back up,
and **Import** to move your data to another machine.

If you turn on **cloud sync** (below), your projects are also stored in your own Supabase database so they
show up on every computer you sign in from. Check with IT before storing CDS work data in an outside service.

## Cloud sync with Supabase (optional, free plan)
1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase-setup.sql`](supabase-setup.sql). It creates the `projects` table and the
   Row Level Security rule that keeps your rows private.
3. In **Project Settings → API**, copy the **Project URL** and the **anon / public** key. Paste them over
   `<SUPABASE_URL>` and `<SUPABASE_ANON_KEY>` at the top of `app.js`.
   Never use the `service_role` key here — it bypasses all security.
4. In **Authentication → URL Configuration**, set the **Site URL** (and add to **Redirect URLs**) the address
   you open the tracker from, e.g. your GitHub Pages URL and/or `http://localhost:3000`.
5. Open the tracker from that address (sign-in links don't work with a file opened from disk; for local use
   run `npx serve` in this folder), enter your email, and click the link you receive.
6. The first time you sign in, the tracker offers to copy any projects already saved in that browser.
7. Recommended: after your first sign-in, turn off **Authentication → Sign In / Providers → Allow new users
   to sign up**, so nobody else can create accounts on your project.

Notes:
- The header shows the sync status. Changes made while offline are retried automatically when you're back
  online, or with **Retry**. You'll be warned before closing the page with unsynced changes.
- If you edit in two places at once, the last save wins.
- Free Supabase projects pause after about a week of no use. Restore it from the Supabase dashboard; nothing
  is lost. Keep using **Export** as a backup.
- Leaving the placeholders in `app.js` keeps the app in browser-only mode, exactly as before.
