# MediFlow AI — Decisions (ADR)

> Architecture Decision Records. Each entry captures a decision, its reason, alternatives, and tradeoffs.

---

## ADR-001 — Next.js App Router with React Server Components

**Date:** 2026-08-04
**Decision:** Build the app on Next.js 16 App Router, defaulting pages to Server Components.
**Reason:** SSR/edge performance (<2s page loads), colocated routes, easier RSC data fetching, Vercel-ready.
**Alternatives:** Vite + SPA, Remix, CRA.
**Tradeoffs:** More mental model (client/server boundary); mitigated by clear conventions in PROJECT_CONTEXT.md.

---

## ADR-002 — Supabase as the single backend

**Date:** 2026-08-04
**Decision:** Use Supabase for PostgreSQL, Auth, Storage, and Realtime. No separate backend service.
**Reason:** Fastest path to production-grade auth + DB with zero server ops; matches PRD requirement.
**Alternatives:** Custom Node API, Firebase, Postgres + separate auth provider.
**Tradeoffs:** Schema migrations must be managed in-repo (done via `supabase/migrations`); service-role keys are server-only.

---

## ADR-003 — AI behind a provider abstraction (AIService)

**Date:** 2026-08-04
**Decision:** All AI calls go through `services/ai.service.ts` with a provider interface (OpenRouter now; OpenAI/Gemini/Claude later). Model + key come from env.
**Reason:** PRD mandates "never hardcode provider". Allows swapping/free models without touching call sites.
**Alternatives:** Direct OpenRouter calls everywhere.
**Tradeoffs:** One indirection layer; worth it for future-proofing.

---

## ADR-004 — AI is assistant-only (read + summarize, never mutate)

**Date:** 2026-08-04
**Decision:** AI endpoints accept context + prompts and return text/structured suggestions. All writes happen through normal, validated service flows — never through AI.
**Reason:** Safety, auditability, PRD section 7.
**Alternatives:** Allowing AI to execute actions.
**Tradeoffs:** Slightly more clicks for users; far safer.

---

## ADR-005 — Batch/FEFO-first inventory model

**Date:** 2026-08-04
**Decision:** Inventory is modeled with `medicines` + `medicine_batches`; stock lives on batches; sales decrement batches automatically (FEFO default, FIFO optional per settings).
**Reason:** Pharmacy domain requires expiry-aware dispensing (PRD batch tracking).
**Alternatives:** Single stock quantity per medicine.
**Tradeoffs:** More complex queries; handled via repository layer and RPC views.

---

## ADR-006 — Default currency INR, GST tax model

**Date:** 2026-08-04
**Decision:** Currency defaults to INR (₹); tax model supports GST rates 5/12/18/28 with HSN codes; sale items record tax split.
**Reason:** Primary market is India; PRD requires GST-ready.
**Alternatives:** Generic multi-currency from day one.
**Tradeoffs:** Currency stored per store in `settings` so future markets are feasible without schema churn.

---

## ADR-008 — auth_store_id() is SECURITY DEFINER (RLS recursion fix)

**Date:** 2026-08-05
**Decision:** `auth_store_id()` (reads the caller's store from `profiles`) is `SECURITY DEFINER` with `set search_path = public`.
**Reason:** The `profiles` RLS policy referenced `auth_store_id()`, which queries `profiles` → policy re-evaluation → `stack depth limit exceeded`. The definer function reads profiles without RLS, breaking the cycle.
**Alternatives:** Simplify the profiles policy to `id = auth.uid()` only (loses cross-user reads); inline the store lookup everywhere (duplication).
**Tradeoffs:** SECURITY DEFINER runs as the function owner — safe here because it only reads and `search_path` is pinned.

---

## ADR-009 — NEXT_PUBLIC env vars referenced directly, never dynamically

**Date:** 2026-08-05
**Decision:** Browser code reads `process.env.NEXT_PUBLIC_*` via direct references (e.g. `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`), never `process.env[name]`.
**Reason:** Next.js only guarantees static inlining of direct references. A helper that did `process.env[name]` (or preferred the URL var) passed the URL as the anon key → "invalid api key".
**Alternatives:** dotenv-expand style runtime lookup.
**Tradeoffs:** None; this is the documented Next.js pattern.

---

## ADR-010 — create_sale RPC: atomic POS checkout with integrity guards

**Date:** 2026-08-05
**Decision:** Checkout is a single `security definer` PL/pgSQL RPC that, in one transaction: validates
stock (locking batch rows `FOR UPDATE`), allocates batches FEFO, computes GST-inclusive totals +
cost/profit, inserts sale + sale_items + invoice + payment, and updates customer credit.
**Reason:** Splitting these across API calls risks partial sales, oversell, and inconsistent
invoice/payment rows. Locking prevents two cashiers overselling the same batch.
**Alternatives:** Orchestrate from the route with multiple inserts (non-atomic, race-prone).
**Tradeoffs:** Business logic lives partly in SQL; validated via live E2E. Expired batches are
excluded from allocation and a short allocation aborts the sale (no silent item drops).

---

## ADR-011 — Demo account owns the seed store

**Date:** 2026-08-05
**Decision:** The demo owner profile (`owner@mediflow.test`) points at the seed store
(`00000000-…-0001`); the secondary store created at signup was deleted.
**Reason:** Onboarding created a separate empty store, so the demo account saw no data. A single
demo store keeps the POS/dashboard demos meaningful.
**Alternatives:** Re-seeding a fresh store for the demo user.
**Tradeoffs:** Production signup flow is unaffected; only the demo dataset is consolidated.

---

## ADR-012 — API errors sanitized at the route boundary

**Date:** 2026-08-05
**Decision:** Route handlers map known failures (insufficient stock, credit-limit, empty cart) to
specific 4xx codes + friendly messages and log internal DB details server-side only.
**Reason:** `create_sale` raises exceptions with row-level detail; echoing them to the client leaks
schema/constraint internals.
**Alternatives:** Passing raw `error.message` through.
**Tradeoffs:** Slightly less debuggable from the client; compensated by server logs.

---

## ADR-013 — Sales returns: atomic RPC with stock restore + positive-only payment sums

**Date:** 2026-08-11
**Decision:** A return is a single `security definer` RPC (`create_sale_return`) that, in one
transaction, validates returnable quantities (cumulative per payload), restores stock to the
batch each line was sold from, inserts `returns` rows, reduces the sale/invoice totals, records
refunds as **negative `payments` rows** (method ≠ credit), and forgives the customer's
outstanding balance by `min(refund, this sale's old amount_due)`. All "amount paid" math
(dashboard pending payments, `record_customer_payment`, sale `payment_status`) sums only
`amount > 0` rows.
**Reason:** A return touches batches, returns, sales, invoices, payments and customer balances —
splitting it across calls risks partial returns and inconsistent money. Refunds as negative
payment rows keep a single money ledger per sale. Excluding negatives from paid sums is
required or a refund would inflate the amount still due and overcharge customers.
**Alternatives:** A `refunds` table separate from `payments` (split ledger, more joins);
reversing the original payment rows (destroys history); per-item payment allocation (needs a
payment-items schema change).
**Tradeoffs:** Cash refunds on partially-credit sales forgive up to this sale's own due (never
older dues) — a deliberate customer-friendly approximation; exact per-item allocation is a
future enhancement. Per-line rounding (migration 0017) keeps `sales.total` == Σ
`returns.refund_amount` to the paisa.

---

## ADR-014 — Notifications: generated feed with dedup + self-healing read state

**Date:** 2026-08-11
**Decision:** The `notifications` table is fed by a `security definer` RPC
(`generate_notifications`) that scans live data (low stock, near-expiry/expired batches,
supplier dues, pending customer payments). Alerts are deduped by `(type, link)` while unread,
and auto-marked read once the underlying condition clears (stock replenished, batch gone, PO
paid, invoice settled). Realtime delivery uses the standard `supabase_realtime` publication so
the header bell updates live.
**Reason:** Notifications that never clear (or duplicate on every scan) are noise. Deriving
alerts from live data at scan time means there is no separate alerting pipeline to keep in sync,
and the self-healing update keeps the unread badge honest without manual dismissal.
**Alternatives:** Trigger-generated rows on every stock/payment write (more moving parts,
missing conditions require triggers everywhere); a pure client-side computed feed (loses
read-state persistence); per-user fan-out rows (user_id kept nullable — the feed is store-wide
for now).
**Tradeoffs:** The RPC must stay in sync with the source views (`v_inventory_status`), and a scan
is required before alerts appear (the UI exposes "Scan now"). Alerts are store-wide rather than
per-user; a future multi-role build can scope by `user_id`.

---

## ADR-007 — Placeholder routes shipped with the shell

**Date:** 2026-08-04
**Decision:** Every module gets a real route under `app/(dashboard)/` with a consistent placeholder (header + empty state) so the app shell is navigable while modules are built incrementally.
**Reason:** Preserves design-system consistency and lets the shell be tested end-to-end early.
**Alternatives:** Only build real modules.
**Tradeoffs:** Placeholder code is replaced per-module; low risk.
