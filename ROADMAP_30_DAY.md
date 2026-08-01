# 30-Day Development Recommendation

## Week 2 — Controlled use (real data, 1-2 callers)
- Move database from SQLite to Postgres/Supabase before loading any real prospect data.
- Load a small real batch (50-100 prospects) through the CSV importer and fix any mapping edge
  cases specific to the actual campaign spreadsheet format.
- Add the missing inline "edit prospect" form (backend already supports it).
- Add password reset / account management for callers instead of admin-only creation.

## Week 3 — Expanded use
- Convert scheduled automation (inactivity flags, follow-up creation) from on-demand to a real
  cron job or scheduled serverless function.
- Add PDF export for proposals.
- Add role-based UI restrictions (callers shouldn't see admin-only screens like caller creation).
- Load-test the prospect list/search endpoints at the full 1,000-record campaign scale and add
  pagination to the frontend prospect table if response times degrade.

## Week 4 — Commercial review
- Formal QA pass: written defect register, mobile device testing on real hardware, unauthorized
  access testing (confirm every route actually rejects missing/invalid tokens).
- Set up backups (automatic Postgres backups via the hosting provider) and document the restore
  procedure.
- Review actual conversion data from weeks 2-3 and reassess the qualification-engine weights in
  `scoring.js` if certain factors are proving more predictive than others in practice.
- Decide whether the AI call-briefing feature earns its place based on caller feedback — expand it
  (e.g., objection-handling suggestions) or drop it if unused.

## Deferred / explicitly out of scope for 30 days
- Multi-channel outreach (SMS/email sequences) — a separate project once calling workflow is proven
- Commission/payroll integration — depends on QE Auto Club's existing payroll system
- White-labeling or multi-tenant support — not needed for a single-club deployment
