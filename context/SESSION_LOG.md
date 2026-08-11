# MediFlow AI — Session Log

> Chronological journal. Newest entries at the top.

---

## Session 15 — 2026-08-11 — Bug fixes (receive stock + invoice reprint) + Notifications module

**Goals**
- Fix two reported bugs: (1) the "Receive stock" action never opened the receive dialog; (2) there was no way to
  see or print the invoice after leaving POS. Then build the next roadmap task (Notifications).

**Completed Work**
- **Bug 1 — Receive stock (features/purchases/purchases-view.tsx):** the row dropdown's "Receive stock" item did
  `setDetailFor(row.original)` — *identical* to "View order" — so it only opened the order detail. New `openReceive`
  fetches the PO detail and opens `ReceiveDialog` directly (with a spinner + disabled item while loading); the
  receive dialog is now `key`ed by `po.id` so its `useState` lines remount per PO (stale-lines bug); the in-detail
  "Receive stock" button closes the detail first (no stacked dialogs).
- **Bug 2 — Invoice reprint (Sales):** `getSaleDetail` now returns `sku` per item + `customer_phone`;
  `ReceiptDialog` gained `reprint` + `soldAt` props (title "Invoice", shows the sale's original date, "Close"
  instead of "New sale"); `sales-view.tsx` adds "Print invoice" (row-dropdown fetch + detail-dialog button) that
  renders the full thermal/A4 invoice via a `SalePrintDialog` (positive payments only); `/sales` page fetches
  `getInvoiceContext` for the header/footer.
- **Notifications module (next roadmap task):**
  - **Migration `0019_notifications.sql` (pushed live):** `generate_notifications(p_store_id)` RPC scans live data
    into the existing `notifications` table — low stock (v_inventory_status low/out-of-stock), near expiry + expired
    batches (≤90d, qty>0), supplier dues (POs with outstanding), pending customer payments (invoices pending/partial).
    Alerts dedupe by (type, link) while unread and **self-heal**: once the condition clears, the alert auto-marks
    read (stock replenished, batch sold, PO paid, invoice settled). Added `updated_at` column; added the table to the
    `supabase_realtime` publication for live updates.
  - **Migration `0020_fix_notification_transitions.sql` (pushed live, code-review fixes):** a batch crossing
    near_expiry → expired now retires its sibling `near_expiry` alert for the same batch link; the realtime
    publication is created if missing (checked via `pg_publication` — `CREATE PUBLICATION IF NOT EXISTS` isn't
    supported by this PG version).
  - **Backend:** `repositories/notifications.repository.ts` (list + unread count, mark read one/all, generate),
    `GET /api/notifications` (list) + `POST /api/notifications` (scan) + `POST /api/notifications/read` (Zod-validated).
  - **UI:** real `app/(dashboard)/notifications/page.tsx` + `features/notifications/notifications-view.tsx` —
    summary strip (unread / critical / warnings / categories), filter chips (All / Unread / per type), severity-
    coded list (tinted type icons, relative time, view links, per-row mark-read, hover actions), "Mark all read",
    "Scan now". Header bell replaced with `components/layout/notifications-bell.tsx`: live unread-count badge,
    **realtime subscription** (postgres_changes on notifications via the browser client, cleaned up on unmount),
    dropdown preview of the latest 4 with inline mark-read + deep links, 60s poll fallback.
- `types/database.ts` regenerated (includes `generate_notifications`); stale-type `as never` casts removed after
  regen.
- **Live E2E (supabase-js): 22/22** — receive flow (create PO → receive 5 units → batch stock restored 0→5);
  reprint payload (fresh sale → detail with sku + positive payments + invoice_number + total); notifications
  (generate 17 → rows with valid types/severities, idempotent second run = 0 new, mark-read persists, **realtime
  insert event received** over the socket with a real user session). Probe rows cleaned up; temp scripts removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migrations 0019 + 0020 pushed ✓

**Issues**
- Realtime E2E initially failed with the service-role client — realtime needs a real user JWT for RLS; re-ran with
  an anon client + sign-in and the insert event arrived (proves the publication + RLS path work).
- `CREATE PUBLICATION IF NOT EXISTS` is a syntax error on this PG — used a `pg_publication` existence check instead.
- Browser-automation agent still unavailable in this environment; UI fixes verified at the RPC/payload level.

**Next Actions**
- Dashboard refinements: period picker, drill-downs, realtime.
- Settings module (business details, GST, invoice, theme, printer, taxes, users/permissions, backups).
- Employee module (attendance, roles, permissions, activity logs).

---

## Session 14 — 2026-08-11 — POS invoice polish (80mm thermal + A4 PDF invoice)

**Goals**
- Finish the POS polish roadmap item: PDF invoice + thermal printing, and enhance the thermal receipt with proper
  headers, footers and a detailed invoice layout (explicitly requested).

**Completed Work**
- **`features/pos/receipt-dialog.tsx` rewritten** — the checkout receipt is now a toggleable invoice with two
  layouts:
  - **80mm thermal receipt**: centered business header (logo, business name, legal name, address, GSTIN, DL no,
    phone/email), "TAX INVOICE", invoice + sale numbers, date/time, cashier, customer, item table (name, SKU · GST%,
    qty, rate, amount), per-rate GST lines, discount, bold TOTAL, paid/change/balance-due, notes, footer
    (settings.invoice_footer + thank-you + "computer generated · MediFlow AI"), dashed separators.
  - **A4 detailed invoice**: brand block + meta box (invoice no, date, sale no, cashier, payment status),
    Bill-to block, bordered item table (# / description+SKU / qty / rate / disc / GST% / amount), totals block with
    per-rate **CGST + SGST** (CGST = round(gst/2), SGST = gst − CGST so they sum exactly), grand total,
    amount-in-words (Indian lakh/crore via new `amountInWords` in `lib/utils.ts`), payment breakdown, notes,
    footer. `tr` rows are `break-inside-avoid` for clean pagination.
  - Mode toggle (Receipt · 80mm / Invoice · A4) switches the dialog width; `window.print()` prints the active
    layout (browser "Save as PDF" covers PDF export).
- **`getInvoiceContext`** (`repositories/store.repository.ts`): fetches store + settings + current profile's name
  in parallel, all nullable-safe with sensible fallbacks (business name defaults to settings.business_name ??
  store.name). `/pos` server-fetches it and passes it through PosView → ReceiptDialog; receipt lines now carry
  `sku`, per-line `discount` and `gst_rate` so the per-rate GST matches `create_sale`'s per-line math exactly.
- **Print CSS** (`app/globals.css`): `@media print` hides the app and shows only `.print-invoice`, positioned
  top-left with `height: auto` (the dialog's `max-h-[92dvh] overflow-y-auto` is neutralised via
  `[data-slot="dialog-content"]` so long invoices don't clip), `@page { margin: 0 }`, thermal keeps its 80mm
  width, `.no-print` hides the controls.
- **Code-review fixes:** dropped `max-width: none` (was stretching the 80mm receipt to page width) and `inset: 0`
  (was forcing a 92dvh-tall clipped box); CGST/SGST now sum exactly; `amountInWords` handles sub-₹1 amounts;
  `getInvoiceContext` typed `Promise<InvoiceContext>`.
- **Live verification 10/10:** demo owner's store + settings + profile resolve business name, GSTIN, DL field,
  invoice prefix, footer, tax_inclusive, thermal_printer flag and cashier name. Temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ (no DB changes this session)

**Issues**
- No DB/migration changes were needed — the `settings`/`stores` tables already carried the invoice header/footer
  fields (seed rows verified live).
- The POS Settings module (business name/GSTIN/address/footer editing) is still a placeholder — headers/footers
  currently come from seed data until Settings is built.

**Next Actions**
- Notifications module (low stock, near expiry, supplier dues, pending payments, realtime).
- Dashboard refinements: period picker, drill-downs, realtime.
- Settings module (business details, GST, invoice, theme, printer, taxes, users/permissions, backups).

---

## Session 13 — 2026-08-11 — Expenses module (recurring templates + reports feed)

**Goals**
- Build the next roadmap task (Expenses) — CRUD + categories + recurring entries, feeding the Reports expense
  panel that previously showed an empty state.

**Completed Work**
- **Migration `0018_expenses_recurring.sql` (pushed live):** `expenses` gained `is_recurring` (default false),
  `frequency` (monthly/quarterly/yearly, check-constrained) and `next_due_date`. A recurring row is a TEMPLATE —
  it is never posted itself. `generate_due_expenses(p_store_id, p_processed_by)` row-locks due templates
  (`next_due_date <= current_date`), inserts one plain instance dated at the due date, then advances
  `next_due_date` by the frequency interval until it lands strictly after today (missed periods produce no
  duplicates). Returns `{ generated, expense_ids }`.
- **Backend:** `repositories/expenses.repository.ts` (list with recorder names via profiles, create/update/delete
  store-scoped, `generateDueExpenses` RPC wrapper), `schemas/expense.ts` (`EXPENSE_CATEGORIES` suggestions,
  amount coerce-positive, payment-method enum, ISO-date regex, superRefine requiring frequency + next-due when
  recurring), `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/[id]`, `POST /api/expenses/generate` — all
  audited with 400/404 mapping; creates record `paid_by`.
- **UI (Clinical Wayfinding):** real `app/(dashboard)/expenses/page.tsx` replacing the placeholder;
  `features/expenses/expenses-view.tsx` — summary strip (this month / recurring due with amber alert / categories /
  all-time), category chips with per-category totals, search, DataTable with stable per-category tinted badges and
  recurring rows showing frequency + next due, CSV export, delete confirm (template-aware copy), "Post N due"
  button when templates are due; `features/expenses/expense-form-dialog.tsx` — RHF + Zod, category datalist,
  recurring toggle (Switch) revealing frequency + next-due-date (defaults to the 1st of next month),
  `useWatch` for the toggle (avoids the react-hooks form.watch warning).
- **Refactor:** `downloadCsv` extracted from reports-view into `lib/utils.ts` (shared by Reports + Expenses).
- **Code-review fixes:** creates now store `paid_by` (user id resolved in the route, like the generate route); the
  "due today" check uses `localDayKey` (UTC `toISOString` could shift the day around local midnight); expense/
  next-due dates validated with an ISO regex.
- `types/database.ts` regenerated (now has the expenses columns + `generate_due_expenses`).
- **Live E2E (supabase-js, demo owner): 13/13** — one-off create/update/delete; monthly template due today →
  instance dated today (plain, amount copied) + `next_due_date` advanced exactly +1 month (day preserved,
  08-11 → 09-11); template due 2 months ago → instance dated at its due date and `next_due_date` advanced past
  today with no backdated duplicates; a second generate → 0; updated expense amount appears in the Reports
  expense-source query. Test rows cleaned up; temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migration 0018 pushed ✓

**Issues**
- `z.iso.date()` isn't exposed by the installed zod build — used an ISO-date regex instead.
- The node PATH quirk from Session 12 persisted; scripts ran under the nvm v22.14.0 path explicitly.
- Two E2E assertion bugs (day-preserving month advance vs 1st-of-month; checking reports after deleting the row)
  were test bugs, not product bugs — fixed in the script, not the code.

**Next Actions**
- POS polish: PDF invoice, thermal printer, returns/exchange from POS.
- Notifications module (low stock, near expiry, supplier dues, pending payments, realtime).
- Dashboard refinements: period picker, drill-downs, realtime.

---

## Session 12 — 2026-08-11 — Sales returns & refunds (Phase 6 complete)

**Goals**
- Pick up the roadmap's next task: the sales returns/refunds flow (RPC + UI) to finish Phase 6.

**Completed Work**
- **Migration `0016_sale_returns.sql` (pushed live):** `create_sale_return` RPC — atomic partial/full return of a
  completed sale:
  - validates the sale belongs to the store, is `completed`, and quantities don't exceed what is still returnable
  - restores stock to the batch each line was sold from (`batch_id` null → earliest-expiry fallback); the existing
    batch trigger syncs the inventory cache
  - writes one `returns` row per returned line (`return_type 'return'`, refund_amount, reason, processed_by)
  - reduces `sales.subtotal/tax/total/cost_of_goods/profit` by the returned share (sale-level discount allocated
    proportionally); fully returned → `status 'returned'` + `payment_status 'refunded'`; partial → payment_status
    recomputed from **positive** payments only
  - mirrors the refund on the invoice (total/amount_paid/amount_due; full → `status 'refunded'`)
  - records a **negative payment row** for non-credit refunds (money-out, method ≠ credit)
  - forgives `customers.outstanding_balance` by `min(refund, this sale's old amount_due)` — never touches older
    unrelated dues; credit-method refunds stay on the account
  - also hardened `record_customer_payment` to sum only `amount > 0` so a refund can't inflate an invoice's due.
- **Migration `0017_fix_sale_return_validation.sql` (pushed live, code-review fixes):** cumulative per-payload
  quantity validation (duplicate lines for the same sale_item can no longer over-return — the old refund-total
  guard couldn't catch it in multi-line sales) and per-line rounding (sale header is decremented by the sum of the
  rounded lines, so `sales.total` == Σ `returns.refund_amount` to the paisa).
- **Backend:** `schemas/sale.ts` (returnItem + createSaleReturn Zod), `repositories/sales.repository.ts`
  (`createSaleReturn` RPC wrapper; `SaleDetail` now carries a `returns` list with medicine names),
  `POST /api/sales/[id]/returns` (400/404/409 mapping incl. "sale item not found", audit log).
  `repositories/dashboard.repository.ts` pending-payments now skips negative rows.
- **UI (Clinical Wayfinding):** `features/sales/return-dialog.tsx` — per-line qty steppers capped at remaining
  returnable (with "X already returned" hint), per-line reason, refund method (cash/upi/card/credit/bank_transfer),
  refund note, live refund estimate mirroring the RPC math, "Return the entire sale" quick action, credit-refund
  explanation callout, destructive submit with amount. `sales-view.tsx` — "Return items" button in the invoice
  dialog (completed sales only), a rose-tinted prior-returns section, refund payment rows shown rose with a
  `refunded` badge, query invalidation on return.
- `types/database.ts` regenerated from the live schema (now includes `create_sale_return`).
- **Live E2E (supabase-js, demo owner): 28/28 + 9/9** — paid sale 3 units → partial return 1 (refund = 1 unit,
  stock +1, negative payment row, totals reduced, status paid) → over-return 409 → duplicate-line 409 → full return
  (refund 2 units, status `returned`, `refunded`, invoice `refunded`, stock fully restored, positive payments
  intact); credit sale + credit refund → outstanding cleared, no money-out row, `record_customer_payment` then
  rejects (balance 0); fixes verified: duplicate-line over-return rejected in a two-line sale with a ₹1 discount,
  refund ₹118.47 reconciles header == Σ returns rows exactly, stock restored. Temp scripts removed; test customer
  deactivated.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migrations 0016 + 0017 pushed ✓

**Issues**
- The basher's default PATH pointed at a stale `node-v22` (Laragon) that no longer exists; `node` resolution
  flipped between spawns. Fixed by using the nvm v22.14.0 path explicitly (`/c/Users/alama/AppData/Local/nvm/v22.14.0`).
- Node 18 (Laragon) can't run `--env-file` or the supabase-js WebSocket path — the E2E needs Node 22+.

**Next Actions**
- Expenses module (categories, recurring entries) — placeholder today; would feed the reports expense panel.
- POS polish: PDF invoice, thermal printer, returns/exchange from POS.
- Notifications module (low stock, near expiry, supplier dues, pending payments, realtime).

---

## Session 11 — 2026-08-10 — Exceptional POS upgrade

**Goals**
- Make the POS exceptional: a rich set of optional power features layered on the existing simple flow.

**Completed Work**
- **Split payments:** `create_sale` gained a `p_payments jsonb` array (cash/upi/card) — one `payments` row per
  method, invoice paid from the tender sum, and overpay rejected (`Payments exceed the sale total`). New UI
  panel with per-method amounts, auto-fill, covered/remaining indicator.
- **Tender-derived `payment_status` (bug fix):** short cash tenders were stamped `paid` while the invoice said
  `pending`. Now fully paid → `paid`, credit → `pending`, short → `partial`. Also fixed precedence so a fully-
  paid split arriving with a stale `credit` method is still `paid` (migration 0014).
- **Deterministic rounding:** `v_subtotal`/`v_tax` rounded to 2dp before `v_total` so client/server agree to the
  paisa and the strict split check can't false-fail on 3dp quantities.
- **Category filters:** `v_inventory_status` now exposes `category_id`/`category_name` (recreated with drop-first,
  migration 0013); POS grid gains filter chips (All + categories with counts) fed by `listCategories` +
  `GET /api/pos/categories`; search route accepts `?category=`.
- **Per-line editor:** click a cart line to expand inline price override + line discount (₹) — sent as per-item
  `discount` and persisted to `sale_items.discount` (backend already supported it; the UI never used it).
- **Cart discount ₹/% toggle**, **quick-cash chips (Exact/₹100–₹2000)** and a WebAudio **numpad** for cash.
- **Settings popover** (persisted to `localStorage`): scanner sounds, show out-of-stock products, default payment
  method. **Scanner beep + success chime** via WebAudio oscillators (no assets).
- **Recent-sales drawer:** `recentSales` now resolves item lines + medicine names; a Sheet lists the last 10
  sales with one-tap **Repeat sale** (stock-clamped, skipped items toasted).
- **Sale notes** (persisted + shown on the receipt), **Ctrl+Enter to charge**, held sales store line discounts +
  notes.
- **Housekeeping:** `types/database.ts` regenerated from the live schema (the hand-written file predated newer
  columns); 4 RPC call sites got `as never` casts where generated types over-strictly mark nullable params.
- **Live E2E (supabase-js): 23/23** — split exact cash+UPI → 2 payment rows + invoice paid; stale-credit split →
  `paid`; short cash → `partial` + pending invoice + correct dues; line discount total + persisted rows; overpay
  rejected; legacy single-method unchanged. Category query verified against the live view (Antibiotics → 3 rows).
- Code review fixes applied: payment-status precedence, category-switch grid flash (skeleton while filtered
  fetch is in flight), Ctrl+Enter guard while receipt open, Clear resets split state, repeat-sale skips toasted.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migrations 0013 + 0014 pushed.

**Bug fix (reported after Session 11):** POS grid showed no medicines while category chips
had counts. Root cause: migration 0013 recreated `v_inventory_status` from the original
0001 definition and **dropped `generic_name`** (which 0006 had added) — `searchProducts`
selects it, PostgREST returned 400, and the route silently resolved `data ?? []` to an
empty grid. Fixed with migration 0015 (view recreated with `generic_name` + category
columns) and hardened `searchProducts`/`listCategories` to **throw on query errors** so a
missing column can never silently blank the grid again. Verified: `/api/pos/search` → 7
products, grid renders product cards, no console errors.

---

## Session 10 — 2026-08-10 — Reports/Customers/POS/Sales tie-ins

**Goals**
- Extend Reports with customer analytics, and tie Reports + Customers into Sales and POS — the missing link was
  that POS had a Credit payment method but **no customer picker**, so credit sales never attached a customer or
  tracked dues.

**Completed Work**
- **Reports:** `getReportData` now computes `top_customers` (top 5 by spend in period: name, orders, spent,
  outstanding balance — with a live customers lookup). New "Top customers" DataTable section in reports-view
  (links each row to `/customers?customer=<id>`, CSV export, empty state points to POS).
- **Customers:** `listCustomerOptions` (lightweight id/name/phone/outstanding/credit_limit/is_active) added for
  pickers; the customers page reads `?customer=<id>` and **auto-opens that profile** (deep link from Sales/Reports);
  profile dialog gained a "New sale" button deep-linking to `/pos?customer=<id>`.
- **POS:** customer picker in the cart (searchable popover over `initialCustomers`, shows phone + "owes ₹X" +
  "at limit" tag), the checkout payload now sends `customer_id`, **credit sales require a customer** (button
  disabled + inline hint + toast), and the selected customer survives Hold/Resume.
- **Sales:** `SaleRow`/`SaleDetail` now expose `customer_id`; the customer name column and detail-dialog name are
  links to `/customers?customer=<id>`.
- **Live E2E (supabase-js):** all 7 checks passed — customer created → POS credit sale attached → dues ₹36 tracked
  (the picker's "owes" source) → sales row carries customer_id → reports top-customers source resolves → payment
  settles balance to ₹0 + sale paid → cleanup. Temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓

**Issues**
- Deep-link auto-open via `useEffect` tripped the set-state-in-effect lint rule; solved with a lazy `useState`
  initializer instead (cleaner and mounts correct).

**Next Actions**
- Sales returns/refunds flow (finish Phase 6).
- Expenses module (categories, recurring entries).
- POS polish: split payments, PDF invoice, thermal printer.

---

## Session 9 — 2026-08-10 — Reports module (Phase 7 Analytics)

**Goals**
- Build the next placeholder module: Reports (roadmap Phase 7 — sales/purchase/inventory/expiry/profit/GST/expense
  analytics with exports).

**Completed Work**
- **`repositories/reports.repository.ts`** — `getReportData(supabase, storeId, period)` for 7d/30d/90d/this-month/all:
  summary KPIs (revenue, profit, margin, orders, avg order value, GST collected, purchases, expenses, net profit,
  customers served), zero-filled daily revenue/profit/orders series, payment-method split, category share (% of
  revenue), top 10 products (units/revenue/profit from sale_items × cost_price), recent purchases with supplier
  names, expenses by category, inventory health snapshot (stock value, low/out-of-stock, expiring ≤90d, expired,
  active count).
- **`GET /api/reports?period=`** — validated period, store-scoped, 401 guard.
- **UI:** `features/reports/reports-view.tsx` + real `app/(dashboard)/reports/page.tsx` (server-fetched 30d default):
  pill period tabs, KPI grid, brand-token trend area chart + category donut, payment-method bars with share,
  expenses list, inventory cards with expired-batch alert, top-products + recent-purchases DataTables, and CSV
  exports (sales/products/expenses) via a client-side `downloadCsv` blob helper.
- **Refactor:** shared day-bucketing helpers (`startOfLocalDay`, `localDayKey`, `dayLabel`, `relativeTime`,
  `zeroFilledDayBuckets`) extracted to `lib/utils.ts`; `dashboard.repository` now imports them instead of
  duplicating (addresses an earlier review note).
- **Live E2E (supabase-js):** 5 completed sales in 90d → revenue ₹577 / profit ₹105.25 / margin 18.2% / GST ₹74.75,
  payment split credit=₹48/cash=₹410/upi=₹119, category share across 5 categories, top products ranked by revenue,
  purchases ₹4090, inventory 7 medicines / ₹30,681 stock. Temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ (`/api/reports` registered)

**Issues**
- Period boundary: sales `gte sold_at ISO` vs local-day bucket keys can drift across TZ; a `key < fromKeyBound`
  guard skips stray rows so daily sums stay consistent with the window.
- The expenses table is empty in the demo DB (no expenses UI yet) — the expense panel correctly shows the empty state.

**Next Actions**
- Sales returns/refunds flow (finish Phase 6).
- Expenses module (would feed the reports expense panel).
- POS polish: split payments, PDF invoice, thermal printer.

---

## Session 8 — 2026-08-10 — Customers module

**Goals**
- Build the next placeholder module: Customers (roadmap Phase 6). Found POS credit sales already increment
  `customers.outstanding_balance`, but **nothing recorded customers paying their dues** — the same gap suppliers
  had before Phase 5.

**Completed Work**
- **Migration `0011_customer_payments.sql` (pushed live):** `record_customer_payment` RPC — validates the customer
  belongs to the store, rejects over-payment, then settles the customer's oldest open invoices FIFO (one payments
  row per invoice, sale `payment_status` → paid/partial so the dashboard pending-payments KPI stays live),
  decrements `outstanding_balance`, with a balance-drift safety net (leftover recorded as a customer-level payment).
- **Backend:** `schemas/customer.ts` (profile + record-payment schemas), `repositories/customers.repository.ts`
  (list with spend/sale-count/last-purchase aggregates, detail with purchase history + payments, RPC wrapper),
  `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/[id]`, `POST /api/customers/[id]/payments` (409
  over-payment, 404, 500 mapping) — all store-scoped with audit logs.
- **UI:** `features/customers/{customer-form,customers-view,customer-payment-dialog}.tsx` + real `app/(dashboard)/customers/page.tsx`:
  DataTable (outstanding w/ credit-limit overrun rose, credit limit, loyalty pts, purchases), search, detail dialog
  (balance/limit/loyalty strip, purchase history w/ StatusBadge, payments list, record-payment), edit + deactivate
  confirm, RHF form — all on Clinical Wayfinding.
- **Live E2E (supabase-js, demo owner):** all 12 checks passed — customer created (limit ₹5000), 2 credit sales
  (₹24 each) → outstanding ₹48, both sales pending, over-payment rejected (due 48.00), pay ₹24 → FIFO settles
  oldest sale to paid / newer stays pending, pay remaining → balance ₹0 + second sale paid, ≥2 payment rows all
  carry customer_id, list resolves. Test customer deactivated afterward; temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migration pushed ✓

**Issues**
- `CustomerDetail` needed `extends CustomerBase` (not object spread) — fixed during typecheck.
- List query now returns the full profile (address/pincode/DOB) so the edit form can prefill without a second fetch.

**Next Actions**
- Sales returns/refunds flow (finish Phase 6).
- Reports module (placeholder today).
- POS polish: split payments, PDF invoice, thermal printer.

---

## Session 7 — 2026-08-10 — Dashboard live data

**Goals**
- Replace the mock-data dashboard with real queries — the roadmap item that had been "next" for several sessions.

**Completed Work**
- **`repositories/dashboard.repository.ts`** — one entry point computing every panel:
  - KPIs: today's sales (with % delta vs yesterday, only when base > 0), 7d revenue (delta vs prev week),
    7d profit (margin hint), pending payments = outstanding balance across open invoices (payments joined).
  - 14-day revenue/profit/orders series, zero-filled per local day; category share (sale_items → medicines →
    categories, top 5 + Others); fast movers (top 4 by units); low stock (active, below min); expiry watch
    (batches expiring ≤ 90d or expired, with batch no + qty); recent sales (top 5, invoice no + customer +
    relative time); AI summary input derived from the same numbers.
- **`GET /api/dashboard`** — store-scoped, 401 guard, same shape as the server render.
- **Page + view**: `app/(dashboard)/page.tsx` server-fetches into `initialData` (shell still renders if Supabase
  is down); `DashboardView` now uses React Query (`["dashboard"]`, window-focus refetch) so returning from a POS
  checkout shows fresh numbers; count-up/charts/alerts preserved; graceful empty states added to every panel;
  `features/dashboard/mock-data.ts` deleted.
- **Live E2E** (supabase-js, demo owner): created 2 demo checkouts (UPI ₹119, cash ₹206) via the POS RPC; verified
  every panel resolves — 7d revenue ₹529 / profit ₹92.39, fast movers ranked (Azithromycin 3u, Vitamin D3 3u…),
  category share across 5 categories, expiring batches listed, low-stock count. Temp script removed.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ (`/api/dashboard` route registered)

**Issues**
- `profiles` has no email column — E2E resolves the profile by user id.
- `create_sale` RPC needs per-item `unit_price`/`gst_rate`/`discount`; corrected in the E2E script.
- Two demo sales left in the demo DB (SALE-260809-0026/-0027) — harmless, they now feed the dashboard.

**Next Actions**
- Sales returns/refunds flow (finish Phase 6).
- POS polish: split payments, PDF invoice, thermal printer.
- Dashboard refinements: period picker, realtime, drill-downs.

---

## Session 6 — 2026-08-09 — Phase 6 Sales + Form design pass

**Goals**
- Build the next roadmap phase (6: Sales) and fix the look of every form (inputs + related components).

**Completed Work**
- **Form components redesign (Clinical Wayfinding):** Input (h-9, filled `bg-muted/40`, hover border shift, teal focus
  ring), Textarea (min-h-20, same fill), SelectTrigger (h-9 + fill + `shadow-popover` content), Checkbox (size-4.5,
  rounded-md, filled), FormMessage (alert icon + xs). New shared `components/shared/form-field.tsx` (Field: label +
  hint + required star) applied to po-form, receive-dialog, payment-dialog; new shared `payment-method-chip.tsx` used
  by dashboard + sales. All RHF forms (supplier/medicine) inherit automatically.
- **Phase 6 Sales (live):** `repositories/sales.repository.ts` (listSales with invoice/customer/item-count resolution
  + payment_status/status filters via typed enum casts; getSaleDetail with items + payments), `GET /api/sales` +
  `GET /api/sales/[id]`, `features/sales/sales-view.tsx` (DataTable, search, two filter selects, detail dialog with
  totals incl. cost/profit + payments), real `app/(dashboard)/sales/page.tsx` replaces the placeholder.
- Verified live via browser: /sales renders (title, header, empty state — DB has 0 sales / 8 invoices, so the empty
  state is honest), no console errors. Diag script confirmed `sales=0` (query works, empty is correct).
- **Post-review fix:** `Field` now auto-generates a control id (`useId`) and clones it into the child control, wiring
  `htmlFor` — label↔input association now works across every form with zero call-site changes. Sales filter enum
  literals verified against the DB enums exactly (no silent empty results). POS/po-form inline inputs keep explicit
  `h-8`/`h-9` overrides so the h-9 default doesn't disturb constrained rows.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓

**Issues**
- Generated-type friction: the hand-written `Database` type has no `Enums`; enum unions come from `@/types`
  (`PaymentStatus`, `SaleStatus`) — fixed import accordingly.
- The live DB has 8 orphaned invoices with 0 sales rows (leftover from earlier E2E); not touched.

**Next Actions**
- Sales returns/refunds flow (RPC + UI) to finish Phase 6.
- Wire dashboard KPIs/charts to live data.
- POS polish: split payments, PDF invoice, thermal printer.

---

## Session 5 — 2026-08-09 — Phase 5 completion: Supplier payments

**Goals**
- "Move ahead with the next task" after the design system. Found Phase 5 (Purchases & Suppliers) already had POs,
  receiving, supplier CRUD and transactions — but **payment tracking was missing** (the PO detail listed payments with no
  way to record one), and the UI predated the design system.

**Completed Work**
- **Migration `0010_supplier_payments.sql` (pushed live):** `record_supplier_payment` RPC — atomic insert into `payments`
  (carries `supplier_id` so supplier aggregates stay live), `FOR UPDATE` row lock on the PO (serializes concurrent
  payments, no over-pay race), over-payment guard, cancelled-order guard, `paid_amount` recomputed from the payments table.
- **Backend:** `recordPaymentSchema` (amount/method cash|upi|card|credit|bank_transfer/reference/notes),
  `recordSupplierPayment` in the purchases repository, `POST /api/purchases/orders/[id]/payments` route with 400/404/409/500
  mapping + audit log.
- **UI:** new `features/purchases/payment-dialog.tsx` (amount prefilled with due, method select, reference, notes, client-side
  over-pay guard); "Record payment" button in the PO detail dialog (hidden when due = 0 or cancelled); `refresh()` now also
  invalidates the `purchase-order` detail query so the payments list updates in place.
- **Design sweep (Clinical Wayfinding):** purchases-view, po-form, receive-dialog, suppliers-view — tinted icon tiles
  (`bg-primary/10`), `shadow-card` + hairline-ring containers, `data-skeleton` shimmer loading, `border-dashed` empty states.
- **Live E2E (supabase-js, demo owner token):** all 10 checks passed — create supplier, create PO (₹90 = 5×18 GST-inclusive),
  record ₹50 → due ₹40 / paid ₹50, over-payment rejected, `paid_amount` persisted, payment row carries `supplier_id` + `paid`
  status. Test supplier deactivated after the run (PO history kept as demo data). Temp script deleted.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓ · migration pushed ✓

**Issues**
- Browser-automation remains flaky for long interactive flows; the E2E ran at the RPC layer under the user token instead.
- Leftover demo data: PO `PO-260809-0003` (supplier "E2E Pharma", now deactivated) shows in the purchases list.

**Next Actions**
- Wire dashboard KPIs/charts to live data (replaces `features/dashboard/mock-data.ts`).
- Purchase returns + invoice upload (backlog).
- POS polish: split payments, PDF invoice, thermal printer, returns/exchange from POS.

---

## Session 4 — 2026-08-09 — Design System v2 (Clinical Wayfinding)

**Goals**
- Give the frontend a distinctive, polished design system so every current and future module looks stunning.
- Installed the `pbakaus/impeccable` frontend-design skill; ran its full new-work flow (init → concept roll →
  direction commit → build → document) for a replacement visual world.

**Completed Work**
- **Rolled direction: "Clinical Wayfinding"** (seed `a74159e7`, Operate mode) — hospital-signage legibility:
  cool clinical white / deep slate grounds, one signage-teal accent, four status zones (emerald/amber/rose/sky)
  shared by badges, deltas and charts. User-confirmed over Command Center / Teletext / quiet-neutral challengers.
- **Tokens** (`app/globals.css`): full OKLCH palettes for both themes, elevation shadows, shimmer + live-dot
  keyframes, themed `::selection`, scrollbar, caret, `tabular-nums`, `prefers-reduced-motion` handling.
- **System components**: `MetricCard` (count-up numerals via new `AnimatedNumber`, zone icon chips, delta pills,
  hover lift), `StatusBadge` (zone dots, pulsing critical), upgraded `PageHeader` (display title), `EmptyState`
  (raised icon tile), `DataTable` (tinted header, chevron pagination, row count), `Skeleton` shimmer, teal
  primary `Button`, softened `Card` ring.
- **Shell**: gradient brand mark + live dot, spring animated active pill with indicator bar, glass header with
  pill search, ambient brand wash in layout, store-online footer.
- **Dashboard showcase**: greeting hero (time-aware) with New-sale CTA, count-up KPI row, brand-token area/donut
  charts, zone-colored low-stock + expiry lists, ranked fast movers, recent sales with method chips.
- **Module sweep**: POS product tiles/cart/payment zones, inventory icon tiles + batches list, auth pages
  (login/signup/forgot + auth shell) — all on the new identity. Placeholder modules inherit automatically.
- **Artifacts**: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, direction contract in `app/layout.tsx`,
  refreshed `docs/UI_GUIDELINES.md` + `context/CURRENT_STATE.md`.
- `lint` ✓ · `typecheck` ✓ (pending final verification run)

**Issues**
- Impeccable's first concept roll ran degraded (no network); a retry reached the API pool (281/531 approved).
- The shipped `impeccable-finish-reviewer` / `impeccable-documenter` agents are not available in this harness;
  DESIGN.md + sidecar were authored from the built world and review used the local reviewer instead.

**Next Actions**
- Phase 5: Purchases & Suppliers (POs, receiving, invoice upload, payment tracking, returns) — build on the new
  design system (DataTable, zone chips, PO cards).
- Wire dashboard KPIs/charts to live data.
- POS polish: split payments, PDF invoice, thermal printer, returns/exchange from POS.

---

## Session 3 — 2026-08-05 — Phase 4 POS (live)

**Goals**
- Build Phase 4: the POS module (cart, search/barcode, payments, hold/resume, receipt) with a
  correct, data-integrity-safe checkout path against the live Supabase DB.

**Completed Work**
- **Schema (migrations 0003–0008, all pushed live):**
  - `0003` `create_sale` RPC: atomic sale + FEFO batch allocation + invoice + payment in one
    transaction; GST-inclusive math; cost/profit; oversell guard; sequence-based numbers.
  - `0004` enum casts for `payment_status`/`invoice` status + fixed missing cost accumulation.
  - `0005` added `updated_at` to `sales` & `invoices` (their `trg_*_updated` triggers failed on
    any UPDATE with 42703 — found via a temporary `diag_triggers()` probe).
  - `0006` exposed `generic_name` on `v_inventory_status` (drop + recreate; column change needs
    drop). POS search had been silently returning [] because the OR filter referenced a missing
    column.
  - `0007` code-review fixes: expired batches excluded from allocation; per-item discounts now
    persisted on `sale_items` (proportional share per allocation chunk); credit-limit enforced
    (0 = unlimited); total clamped ≥ 0; batch rows locked `FOR UPDATE` to prevent concurrent
    oversell; non-credit methods with no tender default to full payment.
  - `0008` abort sale when allocation comes up short (e.g. only expired stock) instead of
    silently dropping items.
- **Routes/repos:** `repositories/pos.repository.ts` (searchProducts, recentSales),
  `repositories/store.repository.ts` (getCurrentStoreId), `schemas/pos.ts`, `app/api/pos/search`
  and `app/api/pos/sales` (GET recent / POST checkout). API now maps stock/credit-limit errors to
  409 with clean messages and never leaks DB internals.
- **UI:** `features/pos/pos-view.tsx` (search + barcode, product grid, cart, discount, GST,
  cash/UPI/card/credit, cash tender + change, hold/resume in localStorage, receipt dialog),
  `features/pos/receipt-dialog.tsx` (printable receipt), `app/(dashboard)/pos/page.tsx` (server
  fetch of products).
- **Data cleanup:** demo owner profile was pointed at a second, empty store; re-pointed to the
  seed store (`00000000-…-0001`) and deleted the orphan store so POS/dashboard see real data.
- **Live E2E passed:** search (name/SKU/barcode), browse, checkout with correct totals
  (subtotal 107.15 / tax 12.85 / total 115 / cost 72 / profit 30.15), FEFO decrement + inventory
  cache sync, oversell → 409, expired → 409 with zero orphan rows, credit over limit → 409,
  credit within limit ok, item discount persisted on sale_items, quick UPI (no tender) → paid
  invoice, empty cart → 400, bogus item → 409.
- `lint` ✓ · `typecheck` ✓ · `next build` ✓

**Issues**
- Browser automation agent still broken in this environment; verified via cookie-based HTTP E2E.
- `supabase db push` warns about a missing local Docker catalog — harmless, pushes still apply.
- Deleting a migration file after pushing it requires `migration repair --status reverted`.

**Files Changed**
- `supabase/migrations/0003…0008_*.sql`, `repositories/{pos,store,inventory}.repository.ts`,
  `schemas/pos.ts`, `app/api/pos/{search,sales}/route.ts`, `features/pos/{pos-view,
  receipt-dialog}.tsx`, `app/(dashboard)/pos/page.tsx`, `app/globals.css`, context files.

**Next Actions**
- Phase 5: Purchases & Suppliers (POs, receiving, invoice upload, payment tracking, returns).
- Wire dashboard KPIs/charts to live data.
- POS polish: split payments, PDF invoice, thermal printer, returns/exchange from POS.

---

## Session 2 — 2026-08-05 — Login fix + Phase 3 Inventory

**Goals**
- Fix the "invalid api key" login failure in the browser.
- Build Phase 3: the Inventory module against the live Supabase schema.

**Completed Work**
- **Root cause of the login bug:** `assertEnv()` in `lib/supabase/client.ts` always returned
  `NEXT_PUBLIC_SUPABASE_URL` when set, so the browser client passed **the URL as the anon key** →
  GoTrue "invalid API key". (Node tests used the correct key directly, so they passed.)
  Rewrote it with direct, statically-inlined `process.env.NEXT_PUBLIC_*` references and verified
  the compiled client bundle now embeds the real URL + anon key.
- **RLS infinite recursion:** the `profiles` policy called `auth_store_id()`, which queries
  `profiles` → re-evaluates the policy → "stack depth limit exceeded" → profile lookups returned
  null → API routes reported UNAUTHORIZED. Fixed with migration `0002` making `auth_store_id()`
  `SECURITY DEFINER` (standard Supabase pattern). Verified user-token profile reads work.
- **Phase 3 Inventory (live):**
  - `repositories/inventory.repository.ts` — typed access to `v_inventory_status`, batches,
    categories, manufacturers; `getCurrentStoreId()` helper.
  - `schemas/medicine.ts` — Zod schemas (medicine + batch); avoided `.default()` to keep the
    zodResolver ↔ useForm generic pairing happy.
  - API routes: GET/POST `/api/inventory/medicines`, PATCH/DELETE `/api/inventory/medicines/[id]`,
    GET `/api/inventory/medicines/[id]/batches`, POST `/api/inventory/batches` — all session +
    store-scoped with audit logging via `write_audit_log` RPC.
  - UI: real `/inventory` page (server-fetched) with DataTable (search, stock filter, expiry
    filter, badges), create/edit medicine dialog (RHF + Zod), add-stock (batch) dialog, batches
    drawer, deactivate confirm.
- **Live E2E:** create medicine → add batch (250) → inventory trigger synced stock=250/value=₹15k
  → PATCH → DELETE → cleanup. All passed.
- Fixed `app/api` underscore pitfall during debugging (`_debug` folder is private in App Router).

**Issues**
- Browser automation agent remains broken in this environment (internal tool schema errors);
  verified via cookie-level HTTP tests instead.
- Dev server needs a restart to pick up new route files reliably.

**Files Changed**
- `lib/supabase/client.ts`, `supabase/migrations/0002_auth_store_security_definer.sql`,
  `repositories/inventory.repository.ts`, `schemas/medicine.ts`,
  `app/api/inventory/{medicines,medicines/[id],medicines/[id]/batches,batches}/route.ts`,
  `features/inventory/{inventory-view,medicine-form,batch-dialog}.tsx`,
  `app/(dashboard)/inventory/page.tsx`, context files.

**Next Actions**
- Wire dashboard KPIs/charts to live data (currently mock).
- Phase 4: POS module (cart, barcode, payments, holds).
