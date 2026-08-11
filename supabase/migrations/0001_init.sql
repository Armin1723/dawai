-- ============================================================================
-- MediFlow AI — 0001_init.sql
-- Full schema: tables, enums, triggers, functions, RLS, views.
-- Apply in order (then run supabase/seed.sql for sample data).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('owner','administrator','manager','cashier','pharmacist','inventory_staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','paid','partial','overdue','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash','upi','card','credit','bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status as enum ('completed','held','void','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type po_status as enum ('draft','ordered','received','partial','cancelled');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Org
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  gstin text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  license_number text,
  logo_url text,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_stores_updated before update on public.stores
  for each row execute function set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  role user_role not null default 'cashier',
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_store on public.profiles(store_id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function set_updated_at();

-- Role / permission reference data
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code user_role not null unique,
  label text not null,
  description text
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  module text
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  role user_role not null default 'cashier',
  employee_code text,
  designation text,
  salary numeric(12,2),
  joined_on date,
  phone text,
  emergency_contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_employees_store on public.employees(store_id);
create trigger trg_employees_updated before update on public.employees
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Catalog
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade, -- null = global reference
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated before update on public.categories
  for each row execute function set_updated_at();

create table if not exists public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  name text not null unique,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_manufacturers_updated before update on public.manufacturers
  for each row execute function set_updated_at();

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  manufacturer_id uuid references public.manufacturers(id) on delete set null,
  name text not null,
  generic_name text,
  sku text not null,
  barcode text,
  composition text,
  strength text,
  dosage_form text,
  hsn_code text,
  gst_rate numeric(5,2) not null default 12,
  mrp numeric(12,2) not null default 0,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  min_stock numeric(12,3) not null default 0,
  max_stock numeric(12,3),
  location text,
  is_prescription_required boolean not null default false,
  is_active boolean not null default true,
  image_url text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);
create index if not exists idx_medicines_store on public.medicines(store_id);
create index if not exists idx_medicines_name on public.medicines using gin (to_tsvector('english', name || ' ' || coalesce(generic_name,'')));
create index if not exists idx_medicines_barcode on public.medicines(barcode);
create trigger trg_medicines_updated before update on public.medicines
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Inventory: batches carry the stock; `inventory` is a cached aggregate.
-- ----------------------------------------------------------------------------
create table if not exists public.medicine_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  batch_number text not null,
  expiry_date date not null,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  mrp numeric(12,2) not null default 0,
  quantity numeric(12,3) not null default 0,
  received_date date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, medicine_id, batch_number)
);
create index if not exists idx_batches_medicine on public.medicine_batches(medicine_id);
create index if not exists idx_batches_expiry on public.medicine_batches(expiry_date);
create trigger trg_batches_updated before update on public.medicine_batches
  for each row execute function set_updated_at();

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  quantity numeric(12,3) not null default 0,
  last_movement_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, medicine_id)
);
create trigger trg_inventory_updated before update on public.inventory
  for each row execute function set_updated_at();

-- Keep inventory.quantity in sync with batches.
create or replace function refresh_inventory_for_medicine(p_medicine_id uuid)
returns void language plpgsql as $$
begin
  insert into public.inventory (store_id, medicine_id, quantity, last_movement_at)
  select m.store_id, m.id, coalesce(sum(b.quantity), 0), now()
  from public.medicines m
  left join public.medicine_batches b on b.medicine_id = m.id
  where m.id = p_medicine_id
  group by m.id, m.store_id
  on conflict (store_id, medicine_id) do update
    set quantity = excluded.quantity,
        last_movement_at = now(),
        updated_at = now();
end $$;

create or replace function trg_batches_sync_inventory()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_inventory_for_medicine(old.medicine_id);
    return old;
  end if;
  perform refresh_inventory_for_medicine(new.medicine_id);
  return new;
end $$;

drop trigger if exists trg_batches_sync on public.medicine_batches;
create trigger trg_batches_sync
  after insert or update or delete on public.medicine_batches
  for each row execute function trg_batches_sync_inventory();

-- ----------------------------------------------------------------------------
-- Suppliers & purchasing
-- ----------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  gstin text,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  opening_balance numeric(12,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function set_updated_at();

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  po_number text not null,
  status po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  received_date date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, po_number)
);
create trigger trg_po_updated before update on public.purchase_orders
  for each row execute function set_updated_at();

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  batch_number text,
  expiry_date date,
  quantity numeric(12,3) not null default 0,
  received_quantity numeric(12,3) not null default 0,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  mrp numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 12,
  gst_amount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_po_items_order on public.purchase_items(purchase_order_id);

-- ----------------------------------------------------------------------------
-- Customers & sales
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  date_of_birth date,
  blood_group text,
  credit_limit numeric(12,2) not null default 0,
  outstanding_balance numeric(12,2) not null default 0,
  loyalty_points integer not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_store on public.customers(store_id);
create trigger trg_customers_updated before update on public.customers
  for each row execute function set_updated_at();

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  -- FK to invoices added below (circular reference with invoices.sale_id)
  invoice_id uuid,
  customer_id uuid references public.customers(id) on delete set null,
  cashier_id uuid references public.profiles(id) on delete set null,
  sale_number text not null,
  status sale_status not null default 'completed',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  cost_of_goods numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  payment_status payment_status not null default 'paid',
  payment_method payment_method not null default 'cash',
  notes text,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sale_number)
);
create index if not exists idx_sales_store_date on public.sales(store_id, sold_at desc);
create trigger trg_sales_updated before update on public.sales
  for each row execute function set_updated_at();

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  batch_id uuid references public.medicine_batches(id) on delete set null,
  quantity numeric(12,3) not null default 0,
  unit_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 12,
  gst_amount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_sale_items_medicine on public.sale_items(medicine_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  invoice_number text not null,
  -- FK to sales added below (circular reference with sales.invoice_id)
  sale_id uuid,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_date timestamptz not null default now(),
  due_date date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  status payment_status not null default 'pending',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, invoice_number)
);
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function set_updated_at();

-- Circular references between sales and invoices (added after both tables exist).
alter table public.sales
  add constraint fk_sales_invoice foreign key (invoice_id) references public.invoices(id) on delete set null;
alter table public.invoices
  add constraint fk_invoices_sale foreign key (sale_id) references public.sales(id) on delete set null;

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  sale_item_id uuid references public.sale_items(id) on delete set null,
  medicine_id uuid references public.medicines(id) on delete set null,
  batch_id uuid references public.medicine_batches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  quantity numeric(12,3) not null default 0,
  refund_amount numeric(12,2) not null default 0,
  reason text,
  return_type text not null default 'return' check (return_type in ('return','exchange')),
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_returns_sale on public.returns(sale_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  amount numeric(12,2) not null default 0,
  method payment_method not null default 'cash',
  status payment_status not null default 'pending',
  reference text,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_sale on public.payments(sale_id);

-- ----------------------------------------------------------------------------
-- Prescriptions, expenses, ops
-- ----------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  doctor_name text,
  hospital text,
  image_url text,
  notes text,
  valid_until date,
  refill_reminder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_prescriptions_updated before update on public.prescriptions
  for each row execute function set_updated_at();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12,2) not null default 0,
  paid_by uuid references public.profiles(id) on delete set null,
  payment_method payment_method not null default 'cash',
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_expenses_store_date on public.expenses(store_id, expense_date desc);
create trigger trg_expenses_updated before update on public.expenses
  for each row execute function set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info','warning','danger','success')),
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_store on public.activity_logs(store_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_store on public.audit_logs(store_id, created_at desc);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null default 'openrouter',
  model text,
  prompt text not null,
  response text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  url text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  type text not null,
  title text not null,
  period_start date,
  period_end date,
  file_url text,
  format text not null default 'pdf',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade unique,
  business_name text,
  gstin text,
  phone text,
  email text,
  address text,
  invoice_prefix text not null default 'INV-',
  invoice_footer text,
  tax_inclusive boolean not null default true,
  default_payment_method payment_method not null default 'cash',
  stock_method text not null default 'fefo' check (stock_method in ('fefo','fifo')),
  low_stock_threshold numeric(12,3) not null default 10,
  expiry_alert_days integer not null default 30,
  thermal_printer boolean not null default false,
  theme text not null default 'system',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
-- Store id of the current authenticated user (null if none).
create or replace function auth_store_id()
returns uuid language sql stable as $$
  select store_id from public.profiles where id = auth.uid();
$$;

-- Batch allocation for a sale: FEFO by default, FIFO when requested.
create or replace function select_sale_batches(
  p_medicine_id uuid,
  p_quantity numeric,
  p_fifo boolean default false
)
returns table (
  batch_id uuid,
  batch_number text,
  expiry_date date,
  unit_cost numeric,
  allocated numeric
) language plpgsql stable as $$
begin
  return query
  with ranked as (
    select b.id, b.batch_number, b.expiry_date, b.received_date,
           b.purchase_price as unit_cost,
           b.quantity,
           -- FEFO (default): earliest expiry first · FIFO: earliest received first
           sum(b.quantity) over (
             order by
               case when p_fifo then b.received_date else b.expiry_date end asc nulls last,
               b.created_at asc
           ) as running_total
    from public.medicine_batches b
    where b.medicine_id = p_medicine_id
      and b.quantity > 0
  )
  select r.id, r.batch_number, r.expiry_date, r.unit_cost,
         case when r.running_total <= p_quantity then r.quantity
              else p_quantity - (r.running_total - r.quantity)
         end as allocated
  from ranked r
  where r.running_total - r.quantity < p_quantity
  order by
    case when p_fifo then r.received_date else r.expiry_date end asc nulls last,
    r.batch_number asc;
end $$;

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------
create or replace view public.v_inventory_status as
select
  m.id as medicine_id,
  m.store_id,
  m.name,
  m.sku,
  m.barcode,
  m.mrp,
  m.selling_price,
  m.purchase_price,
  m.gst_rate,
  m.min_stock,
  m.location,
  m.is_active,
  coalesce(i.quantity, 0) as current_stock,
  coalesce(i.quantity, 0) * m.selling_price as stock_value,
  case
    when coalesce(i.quantity, 0) <= 0 then 'out of stock'::text
    when coalesce(i.quantity, 0) <= m.min_stock then 'low'::text
    else 'in stock'::text
  end as stock_status,
  min(b.expiry_date) as earliest_expiry,
  case
    when min(b.expiry_date) < current_date then 'expired'::text
    when min(b.expiry_date) <= current_date + interval '30 days' then 'near expiry'::text
    else 'ok'::text
  end as expiry_status
from public.medicines m
left join public.inventory i on i.medicine_id = m.id
left join public.medicine_batches b on b.medicine_id = m.id
group by m.id, i.quantity;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.categories enable row level security;
alter table public.manufacturers enable row level security;
alter table public.medicines enable row level security;
alter table public.medicine_batches enable row level security;
alter table public.inventory enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_items enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.invoices enable row level security;
alter table public.returns enable row level security;
alter table public.payments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.attachments enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Reference data (roles / permissions): readable by any authenticated user.
create policy "roles_read" on public.roles for select to authenticated using (true);
create policy "permissions_read" on public.permissions for select to authenticated using (true);
create policy "role_permissions_read" on public.role_permissions for select to authenticated using (true);

-- Global catalog entries (store_id null) are readable by everyone; store-owned by members.
create policy "catalog_global_read" on public.categories for select to authenticated using (store_id is null or store_id = auth_store_id());
create policy "catalog_global_read" on public.manufacturers for select to authenticated using (store_id is null or store_id = auth_store_id());

-- Generic store-scoped policies.
do $$
declare t text;
begin
  foreach t in array array[
    'employees','medicines','medicine_batches','inventory','suppliers','purchase_orders',
    'purchase_items','customers','sales','sale_items','invoices','returns','payments',
    'prescriptions','expenses','notifications','activity_logs','audit_logs',
    'ai_conversations','attachments','reports','settings'
  ]
  loop
    execute format('create policy "store_select" on public.%I for select to authenticated using (store_id = auth_store_id());', t);
    execute format('create policy "store_insert" on public.%I for insert to authenticated with check (store_id = auth_store_id());', t);
    execute format('create policy "store_update" on public.%I for update to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());', t);
    execute format('create policy "store_delete" on public.%I for delete to authenticated using (store_id = auth_store_id());', t);
  end loop;
end $$;

-- profiles: users manage their own row; store membership can read colleagues.
create policy "profiles_own_select" on public.profiles for select to authenticated using (id = auth.uid() or store_id = auth_store_id());
create policy "profiles_own_update" on public.profiles for update to authenticated using (id = auth.uid());

-- stores: members can read/update their store; creation is service-role only.
create policy "stores_select" on public.stores for select to authenticated using (id = auth_store_id());
create policy "stores_update" on public.stores for update to authenticated using (id = auth_store_id());

-- ----------------------------------------------------------------------------
-- Audit helper: log a mutating action (called from services/route handlers).
-- ----------------------------------------------------------------------------
create or replace function write_audit_log(
  p_entity text, p_entity_id uuid, p_action text,
  p_before jsonb default null, p_after jsonb default null
) returns void language plpgsql as $$
begin
  insert into public.audit_logs (store_id, user_id, entity, entity_id, action, before, after)
  values (auth_store_id(), auth.uid(), p_entity, p_entity_id, p_action, p_before, p_after);
end $$;
