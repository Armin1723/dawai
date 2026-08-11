# Changelog

All notable changes to MediFlow AI.

## [0.3.0] — 2026-08-05

### Added
- **POS module (Phase 4, live):** `/pos` checkout terminal — instant search + barcode (name /
  generic / SKU / barcode), product grid, cart with quantity steppers, cart discount, GST,
  cash/UPI/card/credit, cash tender + change, hold/resume (localStorage), printable receipt.
- Atomic `create_sale` RPC: FEFO batch allocation, stock decrement + inventory cache sync,
  invoice + payment rows, cost-of-goods & profit computation, oversell guard.
- POS API: `/api/pos/search`, `/api/pos/sales` (GET recent / POST checkout) — session +
  store-scoped, clean 409/400 error mapping (no DB detail leakage).
- Migrations 0003–0008: create_sale, enum casts, missing `updated_at` on sales/invoices,
  `generic_name` on `v_inventory_status`, expired-stock exclusion, persisted per-item discounts,
  credit-limit enforcement, batch row locking, short-allocation abort.

### Fixed
- `sales`/`invoices` `updated_at` triggers failing with 42703 on any UPDATE.
- POS search silently returning nothing (view lacked `generic_name`).
- Checkout could charge for items whose stock was entirely expired (items silently dropped).
- Internal DB error details leaked in API 500 responses.

## [0.2.0] — 2026-08-05

### Fixed
- Browser login "invalid api key" — `assertEnv` passed the Supabase URL as the anon key; now
  direct inlined env references (verified in the compiled client bundle).
- RLS infinite recursion (`stack depth limit exceeded`) — `auth_store_id()` is now
  `SECURITY DEFINER` (migration 0002).

### Added
- **Inventory module (Phase 3, live):** repository layer, Zod schemas, 6 API routes
  (list/create/update/deactivate medicine, add batch, list batches), server-rendered inventory
  page with search, stock/expiry filters, status badges, create/edit dialog, add-stock dialog,
  batches drawer, deactivate confirmation. Full E2E verified against the live DB.

## [0.1.0] — 2026-08-04

### Added
- Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui (radix-nova) foundation
- Full dependency set (Supabase, TanStack Query/Table, Zustand, Framer Motion, Recharts, RHF+Zod,
  Sonner, react-dropzone, next-themes, date-fns, cmdk)
- `/context` and `/docs` documentation set (PRD-driven)
- Supabase schema migration + seed covering the full PRD data model
- `AIService` provider abstraction with OpenRouter implementation
- Auth pages (login, signup, forgot password) + role middleware + protected routes
- Dashboard shell (sidebar, header, command palette, theme toggle, loading/error states)
- Dashboard: KPI cards, revenue/sales charts, low-stock & near-expiry alert lists

### Planned
- Phase 3+ modules: inventory, POS, purchases, suppliers, customers, prescriptions, sales,
  expenses, employees, reports, notifications, settings, AI features (see `context/ROADMAP.md`)
