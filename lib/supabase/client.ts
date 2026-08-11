"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client. NEXT_PUBLIC_* references are statically inlined by
 * Next.js, so each variable is referenced directly (never via a dynamic
 * process.env[name] lookup, which is not guaranteed to be inlined).
 */
export function createSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "missing",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing"
  );
}

// Singleton for client components.
let client: ReturnType<typeof createSupabaseClient> | null = null;
export function getSupabaseClient() {
  if (!client) client = createSupabaseClient();
  return client;
}
