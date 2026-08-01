# QE Auto Club — Stewardship Sales Command Center

Role-based CRM for the Stewardship campaign: Admin, Sales Manager, and Caller each get their
own dashboard and permission set. Prospect database, CSV import, priority scoring, caller
workflow, Kanban pipeline, proposals, contracts, payments, reports, notifications, activity
logs, and user management.

**Stack:** React 18 + Vite + Tailwind + CSS variables (frontend) · Node/Express + Prisma
(backend) · PostgreSQL via Supabase.

## Quick start (one command)

```bash
npm run install:all
npm run dev
```

That's it. The root `npm run dev` starts both backend and frontend together. The backend's own
`npm run dev` has a `predev` hook that automatically runs `prisma generate`, `prisma db push`,
and the seed script every time it starts — so your Supabase schema and demo data are always in
sync without a separate migration step.

Open `http://localhost:5173`.

## Demo logins

The login screen is now click-to-select by role — pick a card and the credentials fill in
automatically, no typing needed for the demo accounts.

| Role | Email | Password |
|---|---|---|
| Admin | admin@qeautoclub.demo | Admin123! |
| Executive | executive@qeautoclub.demo | Executive123! |
| Sales Manager | manager@qeautoclub.demo | Manager123! |
| Closer | closer@qeautoclub.demo | Closer123! |
| Finance | finance@qeautoclub.demo | Finance123! |
| Caller | caller@qeautoclub.demo | Caller123! |
| Caller (2nd) | caller2@qeautoclub.demo | Caller123! |

## Database: already configured

`backend/.env` is pre-filled with the Supabase project you gave me (`vozmjrxdwqywztlgxlgz`).
See **`SUPABASE_SETUP.md`** for what each variable means and how to rotate the password later —
**you should rotate it**, since it was shared in plain text in this conversation.

## Project structure

```
backend/
  prisma/schema.prisma     roles, pipeline stages, all tables
  prisma/seed.js           demo users + sample prospects
  src/controllers/         one file per feature area
  src/middlewares/         auth.middleware.js (JWT), role.middleware.js (permissions)
  src/utils/scoring.js     the point-based priority engine
  src/utils/log.js         audit log + notification helpers

frontend/
  src/pages/               one screen per feature
  src/layouts/              DashboardLayout (role-filtered sidebar), AuthLayout
  src/routes/RoleRoute.jsx  role-gated route wrapper
  src/index.css            :root theme variables — change these to re-skin the app
  tailwind.config.js       Tailwind colors read from the CSS variables above
```

## Role permissions

Enforced server-side in `src/middlewares/role.middleware.js` + per-route `requireRole(...)`
calls — not just hidden in the UI. See `FEATURE_REPORT.md` for the full matrix as built.

## Manual setup (if you don't use the root script)

```bash
cd backend && npm install && npm run dev     # auto-syncs schema + seeds on first run
cd frontend && npm install && npm run dev    # separate terminal
```

## Known limitations

See `FEATURE_REPORT.md` for a full, honest breakdown of what's fully built vs. simplified —
PDF/Excel export, e-signature file upload, and a few other spec items are stubbed for this pass.
