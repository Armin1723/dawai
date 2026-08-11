# MediFlow AI — Current State

_Updated at the end of every coding session. Resume from here._

## Current Module

**POS INVOICE POLISH SHIPPED** — checkout now opens a toggleable 80mm thermal receipt / A4 detailed invoice with
business header (name/GSTIN/DL/address/contact), invoice meta, itemized GST with CGST/SGST, amount-in-words,
payments + change/balance, notes, and footer (invoice_footer from settings); next: Notifications module

## Last Completed Feature

- **POS invoice polish (PDF + thermal, no schema change):** checkout's `ReceiptDialog` rewritten with two layouts —
  **80mm thermal** (compact, dashed separators, "TAX INVOICE") and **A4 detailed invoice** (professional table with
  # / description+SKU / qty / rate / disc / GST% / amount, Bill-to block, meta box, grand total, amount-in-words,
  payment breakdown) — toggled in the dialog; `window.print()` prints the active layout (browser "Save as PDF"
  covers the PDF export). Both layouts render a real business **header** (business name from settings, legal name,
  address/city/state/pincode, GSTIN, drug license no, phone/email, logo) and **footer** (settings.invoice_footer +
  thank-you + "computer generated · MediFlow AI"), invoice/sale numbers, date/time, cashier name, customer +
  phone, per-rate GST (CGST = round(gst/2), SGST = gst − CGST so they sum exactly), cart + line discounts, paid
  amount, cash change, credit balance due, and sale notes. New `getInvoiceContext` in `repositories/store.repository.ts`
  (store + settings + cashier name, all nullable-safe fallbacks); `/pos` server-fetches it into the view. Receipt
  lines now carry sku/discount/gst_rate so GST-by-rate is computed client-side identically to `create_sale`.
  `lib/utils.ts` gained `amountInWords` (Indian lakh/crore). Print CSS: `@media print` hides the app, shows only
  `.print-invoice`, neutralises the dialog's scroll clip, `@page { margin: 0 }`; thermal keeps its 80mm width. Live
  check 10/10: store + settings + profile resolve the header fields for the demo owner. lint ✓ typecheck ✓ build ✓.
- **Expenses module (migration 0018, pushed live):** `expenses` gained `is_recurring` / `frequency`
  (monthly/quarterly/yearly) / `next_due_date` — a recurring row is a TEMPLATE; `generate_due_expenses` RPC
  (row-locked) posts one plain instance dated at the due date and advances `next_due_date` to the next occurrence
  strictly after today (missed periods skip without duplicate instances). `repositories/expenses.repository.ts`
  (list with recorder names, create/update/delete, generate wrapper), `schemas/expense.ts` (category, description,
  amount, payment method, date, recurring fields with a superRefine requiring frequency + next-due when recurring),
  API `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/[id]`, `POST /api/expenses/generate` (all audited,
  store-scoped, 400/404 mapping). Real `/expenses` page replacing the placeholder: summary strip (this month /
  recurring due / categories / all-time), category chips with per-category totals, search, DataTable with tinted
  category badges + recurring-template rows showing frequency + next due, CSV export, delete confirm, and an RHF
  form dialog with a recurring toggle (reveals frequency + next-due-date, defaults to the 1st of next month).
  `downloadCsv` extracted from reports-view to `lib/utils.ts` (now shared). Reports' expense panel now has real
  data to group. Live E2E 13/13: one-off CRUD, monthly template due today → instance dated today + next_due +1
  month (day preserved), template due 2 months ago → instance dated at its due date + next_due advanced past today,
  second generate → 0, updated amount shows in the reports source query. `types/database.ts` regenerated.
- **Sales returns & refunds (migration 0016 + 0017, pushed live):** `create_sale_return` RPC — atomic partial/full
  return of a completed sale: validates quantities (cumulative per payload so duplicate lines can't over-return),
  restores stock to the batch each line was sold from (earliest-expiry fallback for legacy rows without batch_id;
  the batch trigger syncs the inventory cache), writes one `returns` row per line (`return_type 'return'`), reduces
  sale totals by the returned share (per-line rounded refunds so header == Σ returns rows to the paisa, with the
  sale-level discount allocated proportionally), recomputes `payment_status` from *positive* payments, marks a fully
  returned sale `returned`/`refunded`, mirrors the refund on the invoice (full → `refunded`), records a negative
  payment row for non-credit refunds (money-out), and forgives the customer's outstanding balance by the refund
  capped at what THIS sale still owed (older dues untouched). `record_customer_payment` + dashboard pending-payments
  now sum only positive payments so refunds can never inflate a due. API `POST /api/sales/[id]/returns` (Zod
  schema `schemas/sale.ts`, audit log, 400/404/409 mapping). UI: `features/sales/return-dialog.tsx` (per-line qty
  steppers capped at remaining, per-line reason, refund method + note, live refund estimate, "return entire sale"
  quick action, credit-refund hint) + `Return items` button and prior-returns list in the sales invoice dialog;
  refund rows show rose with a `refunded` badge. `types/database.ts` regenerated from the live schema. Live E2E:
  28/28 (paid sale partial→full return: refund ₹12 then ₹24, stock restored, negative payment rows, totals reduced,
  invoice refunded; guards: over-return, duplicate-line, already-returned) + 9/9 fix checks (duplicate-line
  over-return rejected in a multi-line sale, refund ₹118.47 reconciles header == Σ returns rows with a sale-level
  discount, stock fully restored).
- **POS upgrade (Phase 4 push):** `create_sale` gained **split payments** (`p_payments` jsonb → one payment row per
  method, cash/upi/card), **tender-derived `payment_status`** (fully paid → `paid` even alongside a stale credit
  method; short tender → `partial` — fixing the old bug where short cash was stamped `paid`), deterministic 2dp
  rounding of subtotal/tax, and overpay rejection. `v_inventory_status` now exposes `category_id`/`category_name`
  (migrations 0013 + 0014). POS UI: category filter chips, inline per-line editor (price override + line
  discount ₹, persisted to `sale_items.discount`), cart discount ₹/%, quick-cash chips + WebAudio numpad,
  split-payment panel with auto-fill, settings popover (sound, show out-of-stock, default payment — persisted to
  localStorage), recent-sales drawer with one-tap **repeat sale**, sale notes on the receipt, Ctrl+Enter charge,
  and scanner sounds. `types/database.ts` regenerated from the live schema (the old hand-written file predated
  newer columns), with `as never` casts at 4 RPC call sites where generated types over-strictly mark nullable
  params. Live E2E 23/23: split cash+UPI exact → 2 payment rows + invoice paid; stale-credit split → `paid`;
  short cash → `partial` + pending invoice; line discount totals + persisted rows; overpay rejected; legacy
  single-method unchanged.

- **Reports/Customers/POS/Sales tie-ins:** POS gained a **customer picker** (searchable popover showing phone +
  outstanding + "at limit" tag); checkout sends `customer_id`; **credit sales now require a customer** (button
  disabled + inline hint) so dues are always tracked; the customer survives Hold/Resume. Reports gained a **Top
  customers** panel (top 5 by spend with orders/spent/outstanding, CSV, links into customer profiles). Sales now
  expose `customer_id` and link customer names to `/customers?customer=<id>`. The customers page auto-opens the
  profile from that deep link and its profile dialog has a "New sale" button → `/pos?customer=<id>` (POS preselects
  the customer). Live E2E: POS credit sale attached to a customer → dues ₹36 → sales row carries customer_id →
  reports top-customers source resolves → payment settles to ₹0 + sale paid.
- **Reports module (live):** `repositories/reports.repository.ts` — `getReportData(supabase, storeId, period)` for
  7d/30d/90d/this-month/all: summary KPIs (revenue, profit, margin, orders, avg order value, GST collected,
  purchases, expenses, net profit, customers served), daily revenue/profit/orders series (zero-filled), payment
  split, category share (with % share), top 10 products (units/revenue/profit), recent purchases (with supplier
  names), expenses by category, inventory health snapshot (stock value, low/out-of-stock, expiring ≤90d, expired,
  active count). `GET /api/reports?period=` (validated, store-scoped). Real `/reports` page replacing the
  placeholder: pill period tabs, KPI grid, brand-token trend area chart + category donut, payment-method bars,
  expenses list, inventory cards, top-products + purchases DataTables, and CSV exports (sales/products/expenses)
  via a client-side `downloadCsv` helper. Shared day-bucketing helpers (`startOfLocalDay`/`localDayKey`/`dayLabel`/
  `relativeTime`/`zeroFilledDayBuckets`) extracted to `lib/utils.ts`; `dashboard.repository` now imports them.
  Live E2E: 5 sales in 90d → revenue ₹577 / profit ₹105.25 / 18.2% margin / GST ₹74.75, payment split
  (credit/cash/upi), category share across 5 categories, top products ranked, purchases ₹4090, inventory
  snapshot (7 medicines, ₹30681 stock).
- **Customers module (live):** `repositories/customers.repository.ts` (list with spend/sale-count/last-purchase
  aggregates; detail with purchase history + payments), `GET/POST /api/customers`, `GET/PATCH/DELETE
  /api/customers/[id]`, `POST /api/customers/[id]/payments`; real `/customers` page replacing the placeholder:
  DataTable (customer, city, purchases, outstanding w/ credit-limit overrun in rose, credit limit, loyalty pts),
  search, detail dialog (balance/limit/loyalty strip, purchase history w/ payment status badges, payments list,
  record-payment button), edit + deactivate, RHF form.
- **Customer payment recording (migration 0011, pushed live):** `record_customer_payment` RPC — settles the
  customer's oldest open invoices first (FIFO), writes one payments row per invoice, flips each sale's
  payment_status to paid/partial (keeping the dashboard pending-payments KPI live), decrements
  `customers.outstanding_balance` (mirrors the += in create_sale), over-payment guard + balance-drift safety net.
  Live E2E: 2 credit sales → ₹48 outstanding, over-pay rejected, FIFO oldest→paid/newest→pending, full settle →
  balance ₹0 + second sale paid, payment rows carry customer_id.
- **Dashboard live data:** `repositories/dashboard.repository.ts` computes real KPIs (today's sales + delta vs yesterday,
  7d revenue/profit + margin, pending payments from open invoices), a zero-filled 14-day revenue/profit/orders series,
  category share (via sale_items → medicines → categories, top-5 + Others), fast movers (top 4 by units), low stock
  (active, below min), expiry watch (batches within 90 days or expired, with batch no/qty), recent sales (top 5 with
  invoice no + customer + relative time) and the AI summary input. `GET /api/dashboard` (store-scoped, 401 guard);
  the dashboard page server-fetches into `initialData` and the view refetches on window focus via React Query (so POS
  checkouts appear on return). Empty states added for every panel; `features/dashboard/mock-data.ts` deleted. Live E2E:
  created 2 demo checkouts (UPI ₹119 + cash ₹206) → all panels resolve (7d revenue ₹529 / profit ₹92.39, movers,
  category share, expiring batches).
- **Phase 6 — Sales module (live):** `repositories/sales.repository.ts` (list + detail with invoice/customer/items/payments),
  `GET /api/sales` (payment_status/status filters) + `GET /api/sales/[id]`, and a real `/sales` page replacing the
  placeholder: DataTable (invoice, customer, items, method chip, payment status badge, total), search + two filter
  selects, and a detail dialog (line items, totals with cost/profit, payments). Verified live: renders + empty state
  (DB has 0 sales / 8 invoices), no console errors.
- **Form design pass:** Input/Textarea upgraded (36px, filled `bg-muted/40`, hover + teal focus rings), Select trigger
  (h-9, filled, `shadow-popover` content), Checkbox (18px, rounded, filled), FormMessage (icon + xs), new shared
  `Field` wrapper (label + hint + required star) applied to po-form/receive-dialog/payment-dialog, new shared
  `PaymentMethodChip` (used by dashboard + sales).
- **Phase 5 — Purchases & Suppliers (live):** PO list/create (RPC), receive stock (RPC), supplier CRUD + transactions,
  and **supplier payment recording** (new migration 0010 `record_supplier_payment` RPC + `POST /api/purchases/orders/[id]/payments`
  + Record-payment dialog). Live E2E verified: payment 50 on a ₹90 PO → due 40, paid_amount recomputed, payment row carries
  supplier_id (supplier aggregates update), over-payment → rejected, cancelled-order guard. Design sweep of all purchases/
  suppliers UI onto Clinical Wayfinding (tinted icon tiles, ring/shadow containers, shimmer skeletons, zone badges).
- **Design System v2 — "Clinical Wayfinding":** a complete visual identity replacing the neutral shadcn look —
  - New tokens in `app/globals.css`: cool clinical white / deep slate palettes, signage-teal accent, four status zones
    (emerald = ok, amber = caution, rose = critical, sky = info), elevation shadows (`shadow-card/lifted/popover`),
    shimmer/live-dot animations, themed selection/scrollbar/caret, `prefers-reduced-motion` support.
  - Reusable system components: `MetricCard` (count-up numerals, zone icon chips, delta pills, hover lift),
    `AnimatedNumber`, `StatusBadge` (zone dots, pulsing critical), upgraded `PageHeader`, `EmptyState`, `DataTable`
    (tinted header row, chevron pagination), `Skeleton` (shimmer), `Card`/`Button` tokens.
  - Shell: gradient brand mark with live-status dot, animated active-pill sidebar with "you-are-here" indicator bar,
    glass header with pill search, ambient brand wash in the dashboard layout.
  - Dashboard showcase: greeting hero with New-sale CTA, count-up KPI row, brand-token charts, zone-colored
    low-stock / expiry lists, ranked fast-movers, recent sales with method chips.
  - Sweep: POS product tiles + cart + payment zones, inventory icon tiles + batches list, auth pages (login/signup/
    forgot) with new brand identity.
  - Skill: installed `pbakaus/impeccable` (`.agents/skills/impeccable`); PRODUCT.md, DESIGN.md + `.impeccable/design.json`
    created; direction contract recorded in `app/layout.tsx` (seed `a74159e7`).
- Feature behavior untouched: POS math, GST, FEFO, auth, INR formatting all verified unchanged.

## Current Branch

`main`

## Files Modified (this session)

- `features/pos/receipt-dialog.tsx` (rewritten: 80mm thermal + A4 invoice modes), `features/pos/pos-view.tsx`
- `repositories/store.repository.ts` (getInvoiceContext), `app/(dashboard)/pos/page.tsx`
- `lib/utils.ts` (amountInWords), `app/globals.css` (print rules)

## Next Task

1. Notifications module (low stock, near expiry, supplier dues, pending payments, realtime).
2. Dashboard refinements: period picker, drill-downs, realtime.
3. Settings module (business details, GST, invoice, theme, printer, taxes, users/permissions, backups).

## Immediate Blockers

- None. Note: `npx supabase db push` prints a harmless Docker catalog warning (no local Docker).

## Resume Instructions

1. `npm run dev` → http://localhost:3000 · sign in with `owner@mediflow.test` / `MediFlow123!`.
2. Design system source of truth: `DESIGN.md` + `app/globals.css` tokens. New screens must use the zone/status
   vocabulary and shared components from `components/shared/`.
3. `/pos` is fully functional against the live DB (demo store has seeded medicines + batches).
4. Continue with the roadmap (`context/ROADMAP.md`, `context/TASKS.md`).
