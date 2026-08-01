# Feature Report — this round's changes

Straight answer against your memo (roles/permissions, assignment workflow, scoring, funnel,
caller workspace, dispositions, follow-up rules, CSV rules, proposal builder, reporting,
dashboard consistency, deletion/audit, security) plus the two concrete bugs you reported.

## Bugs fixed

- **Login role-switching bug** — most likely cause was browser autofill/password-manager
  interference with the controlled email/password inputs (a well-known class of bug with React
  forms), not a backend issue — I checked the login endpoint logic and it correctly looks up by
  exact email every time. Fixed by replacing free-typed login with a **click-to-select role
  card UI** (matches the reference image you sent): picking a role sets the email/password from
  React state directly (never from DOM/autofill), the form remounts on every role switch
  (`key={role}`) so no stale browser-filled value can survive across switches, and a successful
  login does a **full page reload** rather than a client-side route change, so there is no way
  for any previous session's in-memory state to leak into the next one.
- **CSV "Do not import" on every column** — the mapping dictionary only recognized
  human-phrased headers ("business name", "company name") and real-spreadsheet headers, but not
  exact camelCase field names like your own export's `businessName`/`decisionMaker`/etc., and it
  had no entries at all for your actual master spreadsheet's real columns (`Company`, `Lead ID`,
  `Estimated Fleet Range`, `Priority Tier`, etc. — I opened the file you uploaded to check).
  Rewrote the mapping engine to match three ways: exact field-name match, a real-spreadsheet
  alias table built from your actual file's headers, and a fallback that folds
  research/evidence columns (Fleet Evidence, Outreach Angle, Source URL, Verification Status,
  LinkedIn) into the Notes field instead of dropping them. Verified against both your demo
  export headers and the real 1,000-prospect file's headers — every column now maps to
  something.

## Also added this round

- **Roles expanded** to Admin, Executive, Manager, Closer, Finance, Caller (was Admin/Manager/
  Caller). Route-level permissions updated: payments create is Admin/Finance only, contract
  signing stays Admin/Manager, prospect archiving (see below) is Admin/Manager/Closer, CSV
  export is Admin/Manager/Executive. Caller and Closer are now both scoped server-side to only
  their own assigned prospects (was caller-only before).
- **Archive replaces delete for non-admins** — new `PATCH /prospects/:id/archive` endpoint,
  archived prospects drop out of default list views but aren't destroyed. Permanent delete is
  still Admin-only, unchanged.
- **Prospect assignment fields** — added `backupCaller`, `assignedCloser`,
  `supervisingManager` relations to the data model (per your "every prospect should have a
  primary caller, backup caller, closer, supervising manager" rule). Stored, not yet exposed in
  a dedicated assignment-workflow UI — see below.
- **New prospect fields** matching both your memo and the real spreadsheet: website, county,
  lead source, decision-maker title. CSV import now also accepts (and pre-fills) tier, score,
  status, and assigned caller directly from a spreadsheet, using the sheet's own score/tier when
  present instead of overwriting it with our calculated one.

## What I did NOT build this round — this memo describes a genuinely large system

Being direct rather than quietly dropping scope: your memo describes real workflow depth (31
pipeline stages, a 5-step proposal approval chain, assignment-limit enforcement with a
reassignment queue, a full before/after audit-diff view, dedicated Executive/Closer/Finance
screens, staging vs. production environment separation, MFA, session expiration). That is
genuinely multiple additional builds, not something to silently half-implement. Specifically
still open:

- **31-stage funnel** — still on the previous ~9-stage pipeline (lead → completed). Expanding
  the Kanban board and every stage-transition rule to your full 31 stages is a real piece of
  work I have not done yet.
- **Assignment limits / reassignment queue** — no enforcement of the 50–75/100–150/150–250
  active-account caps, no automatic "no activity in N days → manager's reassignment queue" flow.
  ScoreHistory-style audit exists for tier overrides; reassignment history does not yet.
- **Proposal approval chain** — proposals still go straight from draft to sent; no
  caller-request → closer-review → operations → finance → management-approval sequence.
- **Full audit-diff view** — ActivityLog records action + a short text detail, not a structured
  before/after value pair for every field change.
- **Executive/Closer/Finance dedicated dashboards** — these roles can log in and the sidebar
  correctly shows only what they're permitted to see, but they're using the same dashboard/page
  components as Admin/Manager with data scoping, not custom-built screens per your spec.
- **Security hardening** — no forced password reset on first login, no failed-login lockout, no
  session expiration beyond the JWT's fixed expiry, no MFA. Demo credentials are still visible on
  the login screen (fine for this prototype stage, not for production, exactly as you said).
- **Staging/production separation** — one database, one environment. Setting up an actual
  separate staging Supabase project is an infrastructure decision I'd want you to make explicitly
  (which project, what data goes in it) rather than build unasked.

If you want to keep moving, I'd suggest we tackle these in the order your memo already lists in
section 15/11 — Caller Workspace refinements and dispositions first (closest to done), then
assignment/reassignment enforcement, then the fuller audit trail, before the funnel expansion and
approval chain, since those touch the most other code.
