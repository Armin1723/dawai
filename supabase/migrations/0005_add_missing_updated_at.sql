-- ============================================================================
-- MediFlow AI — 0005_add_missing_updated_at.sql
-- sales and invoices were created without an updated_at column, but both carry
-- trg_*_updated triggers that call set_updated_at() (new.updated_at = now()).
-- Any UPDATE (e.g. create_sale linking the invoice) raised 42703. Add columns
-- and drop the temporary diagnostic helper used to find this.
-- ============================================================================

alter table public.sales add column if not exists updated_at timestamptz not null default now();
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

drop function if exists public.diag_triggers();
