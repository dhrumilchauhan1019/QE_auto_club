# Component Map — every file, what it does

One reference file so you don't have to open 60 files to find something. Grouped by area.

---

## Backend — `backend/src/`

### Entry points
| File | What it does |
|---|---|
| `server.js` | Starts the HTTP server. Also kicks off the automatic background job (`runAutomation`) once on boot and then every 10 minutes — this is what keeps notifications populated without anyone clicking a button. |
| `app.js` | Express app setup: CORS, JSON body parsing, mounts all routes under `/api`, error handler. |

### Config
| File | What it does |
|---|---|
| `config/database.js` | The shared Prisma client instance. Every controller imports `prisma` from here. |
| `config/multer.js` | File-upload config used only by the CSV import endpoint. |

### Middleware
| File | What it does |
|---|---|
| `middlewares/auth.middleware.js` | `requireAuth` — verifies the JWT on every protected route, attaches `req.user`. |
| `middlewares/role.middleware.js` | `requireRole(...roles)` — blocks a route unless `req.user.role` is in the allowed list. This is the actual enforcement of the Admin/Executive/Manager/Closer/Finance/Caller permission matrix, not just hidden UI. |
| `middlewares/error.middleware.js` | Catches any thrown error and returns a consistent `{ error: message }` JSON shape. |

### Utils
| File | What it does |
|---|---|
| `utils/scoring.js` | The priority engine — additive point breakdown (Vehicle Count, Urgency, Decision Maker Access, etc.) that produces score/tier/reason. |
| `utils/validators.js` | Email/phone validation + phone normalization, used by prospect create/update and CSV import. |
| `utils/jwt.js` | Sign/verify JWT tokens. |
| `utils/log.js` | `log()` writes an audit-trail entry. `notify()` sends one user a notification. `notifyRoles()` broadcasts a notification to everyone in a list of roles (e.g. every Admin + Manager) — this is what actually populates the bell icon. |
| `utils/contractNumber.js` | Generates the human-readable `QEAC-2026-00001` style contract number instead of a raw database id. |

### Controllers (one per feature area — this is where the actual logic lives)
| File | What it does |
|---|---|
| `auth.controller.js` | Login, returns JWT + user. |
| `user.controller.js` | Admin user management: list, create, update (name/role/phone/active/password), caller performance stats. |
| `prospect.controller.js` | Prospect CRUD, search/filter/sort, tier override (writes to ScoreHistory), archive, CSV export. Auto-scopes callers/closers to only their own assigned prospects. |
| `csv.controller.js` | CSV preview (column mapping suggestions), import (validation + duplicate detection + creates records), import history. Mapping logic handles both your own exports and the real master spreadsheet's headers. |
| `caller.controller.js` | `next` = the single next prospect to call. `queue` = the full prioritized list shown in the sidebar on the Call Queue page. `logCall` = records an outcome and advances the pipeline stage. |
| `followup.controller.js` | Due-today/overdue/upcoming follow-up lists, mark-complete, the dashboard widget counts (pending proposals/contracts/payments etc). |
| `board.controller.js` | The Kanban pipeline board — groups prospects by stage, handles drag-and-drop stage moves. |
| `proposal.controller.js` | Create a proposal, generate the printable summary, update status (sent/accepted/rejected). Accepting a proposal creates a Contract with a real contract number and notifies Admin/Manager. |
| `contract.controller.js` | List contracts, mark one signed (notifies Finance/Admin). |
| `payment.controller.js` | List payments, record a payment (auto-marks the prospect "completed" once a contract is fully paid, notifies Admin/Manager). |
| `meeting.controller.js` | Schedule/list meetings (presentations, site visits, signings). |
| `dashboard.controller.js` | The role-adaptive dashboard numbers (Admin sees campaign-wide, Caller sees personal). |
| `report.controller.js` | Daily/weekly/monthly reports: conversion by caller/industry/tier, what's stuck. |
| `automation.controller.js` | `runAutomation()` — the core job that flags stale prospects and creates overdue-follow-up notifications. Exported so `server.js` can call it on a timer, not just from the manual "Run Inactivity Check" button. |
| `notification.controller.js` | List/mark-read for the bell icon. |
| `activitylog.controller.js` | The audit trail feed. |
| `settings.controller.js` | Company name + read-only display of call outcomes/pipeline stages. |
| `ai.controller.js` | The AI Assistant — call summary / next action / follow-up suggestion, with or without a real Anthropic API key configured. |

### Routes (`routes/`)
One file per controller, same names (`prospect.routes.js`, `csv.routes.js`, etc.), plus:
- `index.js` — mounts every route file under its `/api/...` prefix.
- `misc.routes.js` — dashboard, reports, automation trigger, AI assist (these didn't need their own dedicated file).

### Database
| File | What it does |
|---|---|
| `prisma/schema.prisma` | The entire data model — every table, field, and relationship. |
| `prisma/seed.js` | Creates the demo users (all 6 roles) and 40 sample prospects. Safe to re-run — skips if data already exists. |

---

## Frontend — `frontend/src/`

### Entry & routing
| File | What it does |
|---|---|
| `main.jsx` | React root render, wraps the app in `BrowserRouter` + `AuthProvider`. |
| `App.jsx` | Every route definition, wrapped in `RoleRoute` for permission checks. |
| `routes/RoleRoute.jsx` | Redirects to `/login` if not logged in, or to `/` if logged in but the wrong role for that page. |
| `contexts/AuthContext.jsx` | Holds the current user, reads/writes `localStorage`. `useAuth()` is used everywhere that needs to know who's logged in or check their role. |
| `api/axios.js` | The shared HTTP client — attaches the JWT to every request automatically, redirects to login on a 401. |

### Layouts
| File | What it does |
|---|---|
| `layouts/AuthLayout.jsx` | The centered card wrapper used only by the login page. |
| `layouts/DashboardLayout.jsx` | The sidebar + top bar shell used by every other page. Sidebar links are filtered by role here (`NAV` array with a `roles` list per item). |

### Common components (`components/common/`)
Reused across pages — generic, no business logic.
| File | What it does |
|---|---|
| `Button.jsx`, `Card.jsx`, `Input.jsx`, `Select.jsx`, `Modal.jsx`, `Table.jsx` | Standard building blocks. |
| `Loader.jsx` | Also exports `TierBadge` and `StatusPill` (small colored pill components), despite the filename. |
| `NotificationBell.jsx` | The bell icon in the top bar. Polls `/notifications` every 60s, shows unread count, mark-all-read. |

### Pages (`pages/`) — one per screen
| File | What it does |
|---|---|
| `Login.jsx` | Click-to-select role cards (Admin/Executive/Manager/Closer/Finance/Caller), then a login form pre-filled with that role's demo credentials. |
| `Dashboard.jsx` | Role-adaptive home screen. |
| `Prospects.jsx` | The searchable/filterable prospect list. Edit and Delete actions are role-gated inline (Edit: Admin/Manager, Delete: Admin only — Caller sees neither). |
| `ProspectDetail.jsx` | Single prospect: contact info, score breakdown, tier override, AI assistant buttons, activity history, follow-ups, meetings, Archive action. |
| `CSVImport.jsx` | Upload → column mapping preview → import → results summary → import history. |
| `CallerWorkspace.jsx` | The Call Queue page: full prioritized queue list on the left (click any prospect to pull it up), current-call card + outcome-logging form on the right. |
| `Followups.jsx` | Due today / overdue / upcoming, plus the six pipeline-health widget cards. |
| `Pipeline.jsx` | The Kanban board — drag a card between stage columns. |
| `ProposalBuilder.jsx` | Build a proposal for a prospect, generates a printable summary. |
| `Contracts.jsx` | Contract list, mark-signed action. |
| `Payments.jsx` | Payment list, record-payment form (Admin/Finance only). |
| `Reports.jsx` | Daily/weekly/monthly report with a period toggle. |
| `Users.jsx` | Admin-only user management: create, edit (name/role/phone/password), enable/disable. |
| `Settings.jsx` | Company name + read-only display of the outcome/stage lists. |
| `ActivityLogs.jsx` | The audit trail feed, scoped to "own" for Callers. |

### Styling
| File | What it does |
|---|---|
| `index.css` | `:root` CSS variables control every color in the app — change them here to re-theme everything at once. Also has a few plain-CSS component classes (`.panel`, `.btn-solid`, `.kanban-card`, etc.) used alongside Tailwind utility classes. |
| `tailwind.config.js` | Tailwind's color palette reads from the same CSS variables in `index.css`, so both systems stay in sync automatically. |

---

## Root
| File | What it does |
|---|---|
| `package.json` | Root-level script — `npm run dev` here starts both backend and frontend together via `concurrently`. |
| `README.md` | Setup instructions. |
| `SUPABASE_SETUP.md` | Supabase connection string setup, `db push` workflow explanation. |
| `FEATURE_REPORT.md` | Honest list of what's fully built vs. simplified against the original spec. |
| `ROADMAP_30_DAY.md` | Suggested next-30-days priorities. |
| `COMPONENT_MAP.md` | This file. |
