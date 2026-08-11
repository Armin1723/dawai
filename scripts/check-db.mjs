#!/usr/bin/env node
/**
 * Read-only connectivity & schema check against the configured Supabase project.
 * Usage: node --env-file=.env.local scripts/check-db.mjs
 * Exit codes: 0 = ready · 1 = not configured · 2 = schema incomplete
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.");
  process.exit(1);
}

const health = await fetch(`${url}/auth/v1/health`, {
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
})
  .then((r) => r.text())
  .catch((e) => `ERR ${e.message}`);
console.log("auth health:", health.slice(0, 120));

const admin = createClient(url, service, { auth: { persistSession: false } });

const expected = [
  "stores", "profiles", "roles", "permissions", "role_permissions", "employees",
  "categories", "manufacturers", "medicines", "medicine_batches", "inventory",
  "suppliers", "purchase_orders", "purchase_items", "customers", "sales",
  "sale_items", "invoices", "returns", "payments", "expenses", "prescriptions",
  "notifications", "activity_logs", "audit_logs", "ai_conversations",
  "attachments", "reports", "settings",
];

const missing = [];
for (const table of expected) {
  const { error } = await admin.from(table).select("*").limit(1);
  if (error) missing.push(table);
}

console.log(`schema: ${expected.length - missing.length}/${expected.length} tables present`);
if (missing.length) {
  console.log("missing:", missing.join(", "));
  console.log("→ apply supabase/migrations/0001_init.sql, then supabase/seed.sql");
  process.exit(2);
}

const { count } = await admin.from("roles").select("code", { count: "exact" });
console.log("roles rows:", count ?? 0);

const { count: meds } = await admin.from("medicines").select("id", { count: "exact" });
console.log("medicines rows:", meds ?? 0);
console.log("✅ Database ready.");
