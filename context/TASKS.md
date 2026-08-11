# MediFlow AI — Task Board

> Kanban board. Move tasks between sections as they progress. **Never delete completed tasks.**

## Backlog

- [ ] POS module — exchange/return from POS (✅ PDF invoice, thermal printer, split payments, line editor, categories, recent-sales repeat, settings, notes, sound)
- [ ] Inventory module — medicine CRUD images, tags (SKU/barcode/batch/expiry/MRP/GST/HSN/location/min-max done)
- [ ] Batch tracking — batch-wise pricing UI, FIFO option in POS (engine supports both)
- [ ] Purchase module — invoice upload, purchase returns (POs, receiving, payment tracking ✅)
- [ ] Supplier module — profiles, GSTIN, contacts, transactions, outstanding balance (✅ core)
- [ ] Customer module — loyalty programme, tags, statements (profiles ✅, credit & due payments ✅, purchase history ✅, POS picker ✅)
- [ ] Prescription module — upload, matching, history, doctor info, refill reminders (OCR future)
- [x] Sales module — returns & refunds flow (✅ migration 0016/0017 RPC: partial/full returns, stock restore, negative refund payments, credit-refund balance forgiveness, invoice mirroring, prior-returns history in invoice dialog; live E2E 28/28 + 9/9)
- [x] Expense module — CRUD, category chips + CSV, **recurring templates** (migration 0018 `generate_due_expenses` RPC: due → posted instance + next-due advanced; "Post N due" action), feeds Reports expense panel; live E2E 13/13
- [ ] Employee module — attendance, roles, permissions, performance, activity logs
- [ ] Reports module — Excel/PDF export, period custom ranges, per-product profit (✅ sales/purchase/inventory/expiry/profit/GST/expense + CSV)
- [x] Notifications module — low stock, near expiry, expired, supplier dues, pending payments, realtime (migrations 0019/0020 `generate_notifications` RPC: dedup + self-healing read state; realtime header bell + page; live E2E 22/22)
- [ ] Settings module — business details, GST, invoice, theme, printer, taxes, users/permissions, backups
- [ ] AI features — dashboard summary, inventory reorder suggestions, sales upsell, chat assistant, report summarization
- [ ] Tests — Vitest unit/integration, Playwright E2E, CI (lint + typecheck + test)
- [ ] Multi-store, wholesale, online ordering, WhatsApp invoices, SMS, mobile app (future roadmap)

## In Progress

- [ ] **Dashboard** — period picker, drill-downs, realtime (✅ core: repository + API + live view)
- [ ] **Phase 4: POS** — exchange/return from POS (✅ cart, barcode scan, holds, customer picker, credit enforcement, split payments, per-line discounts, quick cash + numpad, recent-sales repeat, settings, notes, sound; returns live in Sales; **invoice polish: 80mm thermal + A4 detailed invoice with business header/footer, itemized GST, CGST/SGST, amount in words — verified live 10/10**)
- [ ] **Phase 5: Purchases** — invoice upload, purchase returns

## Blocked

- (none)

## Testing

- (none)

## Completed

- [x] Bug fixes — Receive stock dropdown now opens the receive dialog directly (fetches detail, keyed remount, spinner); Sales can view/print the invoice (thermal + A4 reprint via ReceiptDialog `reprint` mode with real business header from invoice context)
- [x] Cross-module tie-ins — POS customer picker (credit sales require a customer; customer_id in checkout; survives holds), Reports top-customers panel (spend/orders/outstanding + CSV), Sales customer links, Customers deep links (`?customer=` auto-open profile, "New sale" → /pos?customer=); live E2E: credit sale → dues → reports → payment settle
- [x] Reports module (Phase 7 Analytics) — period tabs (7d/30d/90d/this month/all), summary KPIs (revenue/profit/margin/avg order/net profit), daily revenue-profit trend chart, category share donut, payment split, top products, recent purchases, expenses by category, inventory health snapshot, CSV exports (sales/products/expenses); `GET /api/reports?period=`; shared day-bucketing helpers extracted to lib/utils
- [x] Customer module — profiles CRUD, credit limits, outstanding balances, purchase history + payments in a detail dialog, **customer payment recording** (migration 0011 RPC settles oldest open invoices FIFO, flips sale payment_status, decrements balance; live E2E: credit sale → ₹48 due, over-pay 409, FIFO paid/pending, full settle → ₹0)
- [x] Dashboard live data — `repositories/dashboard.repository.ts` (real KPIs, 14d revenue/profit/orders series, category share, fast movers, low stock, expiry watch, recent sales, AI metrics), `GET /api/dashboard`, view rewritten on React Query (server initialData + window-focus refetch) with graceful empty states; `mock-data.ts` deleted; live E2E (2 demo checkouts → all panels resolve)
- [x] Phase 6 Sales — invoice history module (list + detail + payment-status/status filters + method chips), replacing the placeholder; live empty-state verified; returns/refunds flow next
- [x] Form design pass — Input/Textarea/Select/Checkbox/Label/FormMessage upgraded (36px filled fields, teal focus rings, error icons), shared `Field` + `PaymentMethodChip` components applied to all manual forms
- [x] Phase 5 Purchases & Suppliers — PO create/receive (RPCs), supplier CRUD + transactions, **supplier payment recording** (migration 0010 RPC + payments API + dialog; live E2E: record, over-pay 409, paid_amount recompute, supplier aggregates) — UI on the Clinical Wayfinding design system
- [x] Design System v2 — Clinical Wayfinding identity + shared components (count-up KPIs, zone badges, DataTable, shell) across all modules
- [x] Phase 4 POS — cart, instant search + barcode, discounts, GST, FEFO allocation, hold/resume, receipt dialog + print, live E2E verified (checkout, oversell guard, expired-block, credit limit, item discounts, payment defaults)
- [x] POS data-integrity fixes (migrations 0004–0008) — enum casts, cost accumulation, missing updated_at columns, generic_name view, expired-stock exclusion, persisted item discounts, credit-limit enforcement, batch row locking, no negative totals, sanitized API errors
- [x] Phase 3 Inventory — medicines CRUD, batch stock-in, FEFO view, stock adjustments, live E2E verified
- [x] RLS fix — auth_store_id() SECURITY DEFINER (recursion); browser API-key bug fixed
- [x] Phase 2 Authentication — Supabase auth live: signup/login/reset, session middleware, role guards; E2E verified
- [x] Live DB — migration + seed applied to Supabase project (29 tables, roles, demo medicines); `check-db.mjs` green
- [x] Phase 1 foundation — Next.js 16 + TS + Tailwind v4 + shadcn/ui scaffold
- [x] Install all runtime/dev dependencies (0 vulnerabilities)
- [x] Configure ESLint, Prettier, env template, theme tokens
- [x] Create `/context` + `/docs` documentation set
- [x] Supabase clients (browser/server/middleware) + full PRD schema migration + seed SQL
- [x] `AIService` provider abstraction (OpenRouter) with server-only keys
- [x] Auth pages (login/signup/forgot-password), role middleware
- [x] Dashboard shell — sidebar, header, command palette, theme toggle, loading/error states
- [x] Dashboard — KPI metric cards, revenue chart, sales trend, low stock / near expiry lists
