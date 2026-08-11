-- ============================================================================
-- MediFlow AI — seed.sql
-- Reference data (roles/permissions) + a demo store with sample catalog.
-- Run AFTER 0001_init.sql. Idempotent-ish (on conflict do nothing).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
insert into public.roles (code, label, description) values
  ('owner', 'Owner', 'Full access incl. analytics and financial reports'),
  ('administrator', 'Administrator', 'Everything except owner-only financials'),
  ('manager', 'Manager', 'Inventory, sales, reports, purchases, employees'),
  ('cashier', 'Cashier', 'POS, returns, customers'),
  ('pharmacist', 'Pharmacist', 'Prescription verification, medicine information'),
  ('inventory_staff', 'Inventory Staff', 'Inventory, stock counts, expiry updates, receiving')
on conflict (code) do nothing;

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------
insert into public.permissions (code, label, module) values
  ('dashboard.view', 'View dashboard', 'dashboard'),
  ('pos.operate', 'Operate POS', 'pos'),
  ('sales.view', 'View sales', 'sales'),
  ('sales.create', 'Create sales', 'sales'),
  ('returns.create', 'Process returns', 'sales'),
  ('inventory.view', 'View inventory', 'inventory'),
  ('inventory.manage', 'Manage inventory', 'inventory'),
  ('inventory.adjust', 'Adjust stock', 'inventory'),
  ('purchases.view', 'View purchases', 'purchases'),
  ('purchases.manage', 'Manage purchases', 'purchases'),
  ('suppliers.view', 'View suppliers', 'suppliers'),
  ('suppliers.manage', 'Manage suppliers', 'suppliers'),
  ('customers.view', 'View customers', 'customers'),
  ('customers.manage', 'Manage customers', 'customers'),
  ('prescriptions.view', 'View prescriptions', 'prescriptions'),
  ('prescriptions.manage', 'Manage prescriptions', 'prescriptions'),
  ('expenses.view', 'View expenses', 'expenses'),
  ('expenses.manage', 'Manage expenses', 'expenses'),
  ('employees.view', 'View employees', 'employees'),
  ('employees.manage', 'Manage employees', 'employees'),
  ('reports.view', 'View reports', 'reports'),
  ('analytics.view', 'View analytics', 'analytics'),
  ('settings.view', 'View settings', 'settings'),
  ('settings.manage', 'Manage settings', 'settings'),
  ('users.manage', 'Manage users', 'users'),
  ('audit.view', 'View audit logs', 'audit'),
  ('ai.use', 'Use AI features', 'ai')
on conflict (code) do nothing;

-- ----------------------------------------------------------------------------
-- Role → permission mapping (mirrors constants/roles.ts)
-- ----------------------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','pos.operate','sales.view','sales.create','returns.create',
  'inventory.view','inventory.manage','inventory.adjust','purchases.view','purchases.manage',
  'suppliers.view','suppliers.manage','customers.view','customers.manage',
  'prescriptions.view','prescriptions.manage','expenses.view','expenses.manage',
  'employees.view','employees.manage','reports.view','analytics.view',
  'settings.view','settings.manage','users.manage','audit.view','ai.use'
)
where r.code in ('owner','administrator')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','pos.operate','sales.view','sales.create','returns.create',
  'inventory.view','inventory.manage','purchases.view','purchases.manage',
  'suppliers.view','suppliers.manage','customers.view','customers.manage',
  'prescriptions.view','expenses.view','employees.view','reports.view','ai.use'
)
where r.code = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','pos.operate','sales.view','sales.create','returns.create',
  'customers.view','customers.manage'
)
where r.code = 'cashier'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','inventory.view','prescriptions.view','prescriptions.manage',
  'pos.operate','customers.view','ai.use'
)
where r.code = 'pharmacist'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','inventory.view','inventory.manage','inventory.adjust','purchases.view'
)
where r.code = 'inventory_staff'
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Demo store + catalog (for SQL-level testing; the app creates real stores on
-- signup via /api/auth/onboard).
-- ----------------------------------------------------------------------------
insert into public.stores (id, name, legal_name, gstin, phone, email, city, state, currency)
values (
  '00000000-0000-0000-0000-000000000001',
  'MediFlow Demo Pharmacy',
  'MediFlow Demo Retail Pvt Ltd',
  '27ABCDE1234F1Z5',
  '+91 98765 43210',
  'demo@mediflow.app',
  'Pune',
  'Maharashtra',
  'INR'
)
on conflict (id) do nothing;

insert into public.categories (store_id, name) values
  (null, 'Analgesics'), (null, 'Antibiotics'), (null, 'Antipyretics'),
  (null, 'Antacids'), (null, 'Vitamins & Supplements'), (null, 'Antihistamines'),
  (null, 'Cardiovascular'), (null, 'Diabetes Care'), (null, 'First Aid'), (null, 'Ayurvedic')
on conflict do nothing;

insert into public.manufacturers (name) values
  ('Cipla Ltd'), ('Sun Pharma'), ('Dr. Reddy''s'), ('Mankind Pharma'), ('Zydus Cadila'),
  ('GSK'), ('Abbott India'), ('Dabur')
on conflict (name) do nothing;

-- Sample medicines with batches (FEFO demo: two batches with different expiries).
insert into public.medicines (
  store_id, category_id, manufacturer_id, name, generic_name, sku, barcode,
  composition, strength, dosage_form, hsn_code, gst_rate, mrp, purchase_price,
  selling_price, min_stock, max_stock, location, is_prescription_required
)
select
  '00000000-0000-0000-0000-000000000001',
  c.id, m.id, v.name, v.generic, v.sku, v.barcode, v.composition, v.strength,
  v.dosage_form, v.hsn, v.gst, v.mrp, v.purchase, v.selling, v.min, v.max, v.loc, v.rx
from (values
  ('Paracetamol 500mg', 'Paracetamol', 'MED-0001', '8901234500001', 'Paracetamol', '500 mg', 'Tablet', '30049099', 12, 30.00, 8.00, 12.00, 50, 500, 'A-01', false),
  ('Azithromycin 250mg', 'Azithromycin', 'MED-0002', '8901234500002', 'Azithromycin', '250 mg', 'Tablet', '30049099', 12, 85.00, 45.00, 62.00, 20, 200, 'B-02', true),
  ('Amoxicillin 500mg', 'Amoxicillin', 'MED-0003', '8901234500003', 'Amoxicillin', '500 mg', 'Capsule', '30049099', 12, 75.00, 38.00, 55.00, 30, 300, 'B-03', true),
  ('Vitamin D3 60K', 'Cholecalciferol', 'MED-0004', '8901234500004', 'Cholecalciferol', '60K IU', 'Capsule', '21069099', 18, 120.00, 65.00, 95.00, 10, 100, 'C-01', false),
  ('Cetirizine 10mg', 'Cetirizine', 'MED-0005', '8901234500005', 'Cetirizine', '10 mg', 'Tablet', '30049099', 12, 45.00, 12.00, 18.00, 40, 400, 'A-04', false),
  ('Metformin 500mg', 'Metformin', 'MED-0006', '8901234500006', 'Metformin Hydrochloride', '500 mg', 'Tablet', '30049099', 12, 40.00, 10.00, 16.00, 60, 600, 'D-01', true)
) as v(name, generic, sku, barcode, composition, strength, dosage_form, hsn, gst, mrp, purchase, selling, min, max, loc, rx)
join public.categories c on c.name = (case
  when v.generic in ('Paracetamol') then 'Analgesics'
  when v.generic in ('Azithromycin','Amoxicillin') then 'Antibiotics'
  when v.generic = 'Cholecalciferol' then 'Vitamins & Supplements'
  when v.generic = 'Cetirizine' then 'Antihistamines'
  when v.generic = 'Metformin' then 'Diabetes Care'
end)
join public.manufacturers m on m.name = (case
  when v.sku = 'MED-0001' then 'Cipla Ltd'
  when v.sku in ('MED-0002','MED-0003') then 'Sun Pharma'
  when v.sku = 'MED-0004' then 'Abbott India'
  when v.sku = 'MED-0005' then 'Dr. Reddy''s'
  when v.sku = 'MED-0006' then 'Mankind Pharma'
end)
on conflict (store_id, sku) do nothing;

-- Batches: give Paracetamol two batches (one expiring soon) to demo FEFO.
insert into public.medicine_batches
  (store_id, medicine_id, batch_number, expiry_date, purchase_price, selling_price, mrp, quantity, received_date)
select
  m.store_id, m.id, v.batch, v.expiry::date, v.purchase, v.selling, v.mrp, v.qty, v.received::date
from public.medicines m
join (values
  ('MED-0001', 'PARA-2601', '2027-01-31', 8.00, 12.00, 30.00, 150, '2026-05-10'),
  ('MED-0001', 'PARA-2603', '2026-09-15', 7.50, 12.00, 30.00, 60, '2026-07-01'),
  ('MED-0002', 'AZI-2602', '2027-02-28', 45.00, 62.00, 85.00, 80, '2026-06-01'),
  ('MED-0003', 'AMO-2602', '2026-11-30', 38.00, 55.00, 75.00, 120, '2026-06-01'),
  ('MED-0004', 'VIT-2601', '2027-12-31', 65.00, 95.00, 120.00, 40, '2026-05-20'),
  ('MED-0005', 'CET-2601', '2027-03-31', 12.00, 18.00, 45.00, 200, '2026-05-15'),
  ('MED-0006', 'MET-2602', '2026-10-31', 10.00, 16.00, 40.00, 250, '2026-06-10')
) as v(sku, batch, expiry, purchase, selling, mrp, qty, received)
on m.sku = v.sku
on conflict (store_id, medicine_id, batch_number) do nothing;

-- Recompute the inventory cache for seeded medicines.
select refresh_inventory_for_medicine(id) from public.medicines;

-- Demo settings for the seed store.
insert into public.settings (store_id, business_name, gstin, phone, email, invoice_prefix, stock_method, currency)
values (
  '00000000-0000-0000-0000-000000000001',
  'MediFlow Demo Pharmacy', '27ABCDE1234F1Z5', '+91 98765 43210',
  'demo@mediflow.app', 'INV-', 'fefo', 'INR'
)
on conflict (store_id) do nothing;
