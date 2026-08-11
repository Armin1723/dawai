-- ============================================================================
-- MediFlow AI — 0018_expenses_recurring.sql
-- Recurring expenses:
--   1. expenses gains is_recurring / frequency / next_due_date. A recurring
--      row is a TEMPLATE — it is never posted itself; generate_due_expenses
--      instantiates a normal (non-recurring) expense each time it comes due.
--   2. generate_due_expenses(p_store_id, p_processed_by) — for every due
--      template (next_due_date <= today, rows locked FOR UPDATE), inserts one
--      expense dated at the due date, then advances next_due_date to the next
--      occurrence strictly after today (missed periods are skipped without
--      creating backdated instances).
-- ============================================================================

alter table public.expenses
  add column if not exists is_recurring boolean not null default false,
  add column if not exists frequency text
    check (frequency in ('monthly', 'quarterly', 'yearly')),
  add column if not exists next_due_date date;

create or replace function public.generate_due_expenses(
  p_store_id uuid,
  p_processed_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense record;
  v_next date;
  v_id uuid;
  v_generated integer := 0;
  v_ids jsonb := '[]'::jsonb;
begin
  for v_expense in
    select *
    from public.expenses
    where store_id = p_store_id
      and is_recurring = true
      and frequency is not null
      and next_due_date is not null
      and next_due_date <= current_date
    order by next_due_date asc
    for update
  loop
    -- Post one instance dated at the due date (template stays untouched).
    insert into public.expenses (
      store_id, category, description, amount, paid_by, payment_method, expense_date
    ) values (
      p_store_id, v_expense.category, v_expense.description, v_expense.amount,
      p_processed_by, v_expense.payment_method, v_expense.next_due_date
    )
    returning id into v_id;

    -- Advance to the next occurrence strictly after today.
    v_next := v_expense.next_due_date;
    loop
      v_next := case v_expense.frequency
        when 'monthly'   then (v_next + interval '1 month')::date
        when 'quarterly' then (v_next + interval '3 months')::date
        when 'yearly'    then (v_next + interval '1 year')::date
        else v_next
      end;
      exit when v_next > current_date;
    end loop;

    update public.expenses
    set next_due_date = v_next,
        updated_at = now()
    where id = v_expense.id;

    v_generated := v_generated + 1;
    v_ids := v_ids || to_jsonb(v_id);
  end loop;

  return jsonb_build_object(
    'generated', v_generated,
    'expense_ids', v_ids
  );
end $$;
