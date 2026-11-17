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
4. Create your login: **Authentication → Users → Add user → Create new user**. Enter your email and a
   password, and tick **Auto Confirm User**.
5. Turn off **Authentication → Sign In / Providers → Allow new users to sign up**, so nobody else can create
   accounts on your project.
6. Open the tracker and sign in with that email and password. Password sign-in sends no email, so it isn't
   affected by Supabase's email rate limit, and it also works when `index.html` is opened from disk.
7. The first time you sign in, the tracker offers to copy any projects already saved in that browser.

Optional email-link sign-in (**Email me a link instead**): Supabase's built-in email only allows a few emails
per hour. For links to work, set **Authentication → URL Configuration → Site URL / Redirect URLs** to the
address you open the tracker from (e.g. your GitHub Pages URL), and open the tracker from that address.

Notes:
- The header shows the sync status. Changes made while offline are retried automatically when you're back
  online, or with **Retry**. You'll be warned before closing the page with unsynced changes.
- If you edit in two places at once, the last save wins.
- Free Supabase projects pause after about a week of no use. Restore it from the Supabase dashboard; nothing
  is lost. Keep using **Export** as a backup.
- Leaving the placeholders in `app.js` keeps the app in browser-only mode, exactly as before.
