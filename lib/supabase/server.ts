import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "missing",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware refreshes sessions.
          }
        },
      },
    }
  );
}

/** Server-only client with the service-role key (bypasses RLS). Never import into client code. */
export async function createSupabaseAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "missing",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "missing",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}
