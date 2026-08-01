# Supabase Setup — Prisma `db push` workflow

Your `backend/.env` is already filled in with the project you gave me. This doc explains what's
there and how to change it later.

## What's already configured

```
DATABASE_URL="postgresql://postgres.vozmjrxdwqywztlgxlgz:...@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:...@db.vozmjrxdwqywztlgxlgz.supabase.co:5432/postgres"
```

- `DATABASE_URL` — the **pooled** connection (port 6543, PgBouncer transaction mode). Used by
  the running app for normal queries.
- `DIRECT_URL` — the **direct** connection (port 5432). Used only by `prisma db push`, which
  needs a non-pooled connection.
- Your password (`Testing@_0801$`) is URL-encoded in both strings (`@` → `%40`, `$` → `%24`) —
  required because `@` is a URL delimiter and would otherwise break the connection string.

**Rotate this password.** It was shared in plain text in our conversation, which means it's
sitting in chat history. Supabase → Project Settings → Database → Reset database password, then
update both lines in `backend/.env` (re-encode the new password the same way if it also has `@`
or other special characters).

## Why `db push` instead of `migrate`

You asked to run `npx prisma generate` + `npx prisma db push` rather than `migrate dev`. That's
what's wired up — `db push` syncs your Prisma schema straight to the database without creating
migration history files. Good for solo/small-team development where you don't need a migration
audit trail; if you later want proper migration files (e.g. multiple developers, staged
rollouts), switch to `prisma migrate dev` instead — same schema file works with either.

## The "just run npm run dev" setup

`backend/package.json` has:
```json
"predev": "prisma generate && prisma db push --accept-data-loss && node prisma/seed.js"
```
npm automatically runs `predev` before `dev` — this is a built-in npm convention, not custom
code. So every time the backend starts, it re-syncs the schema and re-runs the (idempotent) seed
script. `--accept-data-loss` is there so this can run unattended without a confirmation prompt;
review what `db push` would change before using this flag against a database with real campaign
data you care about (it's safe for demo/dev use).

## First run checklist

```bash
npm run install:all   # from the project root
npm run dev            # starts backend (schema sync + seed) and frontend together
```

Watch the backend terminal output — you should see:
```
Seeded 40 sample prospects.
---
admin@qeautoclub.demo / Admin123!
manager@qeautoclub.demo / Manager123!
caller@qeautoclub.demo / Caller123!  (and caller2@qeautoclub.demo)
```

## Verify in Supabase

Table Editor → you should see `User`, `Prospect`, `Activity`, `Followup`, `Meeting`, `Proposal`,
`Contract`, `Payment`, `ScoreHistory`, `Notification`, `ActivityLog`, `CsvImport`, `Setting`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Can't reach database server` | `DIRECT_URL` wrong, or your network blocks outbound 5432/6543 |
| `password authentication failed` | Password changed since `.env` was written, or encoding is off — re-copy from Supabase and re-encode `@`/`$`/etc. |
| `db push` hangs | Pointed at the pooled (6543) URL instead of direct (5432) for `DIRECT_URL` |
| Seed runs every restart | Expected — it's idempotent (checks existing counts first), safe to run repeatedly |
