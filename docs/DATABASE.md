# MediFlow AI — Database

## Platform

Supabase (PostgreSQL). Managed via SQL migrations in `supabase/migrations/`, applied in order.
Seed data in `supabase/seed.sql`.

## ERD Overview

- **Org**: `stores` → `employees`, `users`/`profiles` (role via `roles`), `settings`
- **Catalog**: `categories`, `manufacturers`, `medicines` → `medicine_batches`
- **Inventory**: `inventory` (per medicine per store), adjustments via `inventory` history
- **Purchasing**: `suppliers`, `purchase_orders` → `purchase_items` → `payments`
- **Sales**: `sales` → `sale_items`, `invoices`, `returns`, `payments` (POS + credit)
- **People**: `customers`, `prescriptions`
- **Ops**: `expenses`, `notifications`, `activity_logs`, `audit_logs`, `ai_conversations`,
  `attachments`, `reports`

## Conventions

- UUID primary keys; `created_at`/`updated_at` on all tables (trigger-managed `updated_at`).
- Money stored as `numeric(12,2)`; quantities as `numeric(12,3)`.
- `status` columns use `text` with CHECK constraints for readability.
- Soft-delete where useful (`deleted_at`).
- Row Level Security (RLS) enabled on all tables; policies grant access by store membership.
  Service role bypasses RLS for server-side operations.

## Key Design Decisions

- **FEFO/FIFO**: stock lives on `medicine_batches`; a SQL function `select_batches(medicine_id, qty)`
  returns batches in FEFO (default) or FIFO order (per store setting). Sales decrement batches in
  that order.
- **GST**: sale/purchase items record `gst_rate`, `gst_amount`; HSN stored on medicines.
- **Audit**: `audit_logs` records actor, action, entity, before/after JSONB. `activity_logs` is the
  user-facing activity feed.

## Migrations

| File                     | Contents                                    |
| ------------------------ | ------------------------------------------- |
| `supabase/migrations/0001_init.sql` | Full schema: tables, enums, functions, triggers, RLS, views |

To apply: run against your Supabase project (SQL editor or `supabase db push`), then `supabase/seed.sql`.
