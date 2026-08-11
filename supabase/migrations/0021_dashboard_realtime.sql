-- ============================================================================
-- 0021 — Dashboard realtime
--
--   The dashboard subscribes to postgres_changes on the tables that drive its
--   panels (sales, payments, invoices, medicine_batches) so KPIs, charts and
--   alerts refresh in place after a POS checkout, a stock receive, or a
--   payment without a manual reload.
-- ============================================================================

do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach v_table in array array[
    'sales', 'payments', 'invoices', 'medicine_batches'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
