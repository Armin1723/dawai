import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const store = (await admin.from('stores').select('id').limit(1).single()).data;
const med = (await admin.from('medicines').select('id').eq('sku', 'POSA').maybeSingle()).data;
console.log('store', store.id, 'med', med?.id);
const { data, error } = await admin.rpc('create_sale', {
  p_store_id: store.id,
  p_cashier_id: '018db8d3-ab24-41e3-beab-ac44b5c713d1',
  p_customer_id: null,
  p_items: [{ medicine_id: med.id, quantity: 1, unit_price: 50, gst_rate: 12, discount: 0 }],
  p_discount: 0,
  p_payment_method: 'cash',
  p_amount_received: 50,
  p_notes: 'diag',
});
console.log('data:', JSON.stringify(data));
console.log('error:', error ? JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }) : 'none');
