import type { UserRole } from "@/types";

export class AuthError extends Error {
  constructor(message: string, public code = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
  }
}

/** Sign up with email + password, then bootstrap a profile + store for the owner. */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) throw new AuthError(error.message, "SIGNUP_FAILED");

  // Bootstrap owner profile + store via the server (service role) so the
  // first user of a brand-new store gets the owner role.
  if (data.user) {
    const res = await fetch("/api/auth/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, fullName, email }),
    });
    if (!res.ok) {
      // Non-fatal — profile can be completed later.
      console.warn("Onboarding failed", await res.text());
    }
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AuthError(error.message, "LOGIN_FAILED");
  return data;
}

export async function resetPassword(email: string) {
  const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw new AuthError(error.message, "RESET_FAILED");
}

export async function signOut() {
  const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(error.message, "SIGNOUT_FAILED");
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: "Owner",
    administrator: "Administrator",
    manager: "Manager",
    cashier: "Cashier",
    pharmacist: "Pharmacist",
    inventory_staff: "Inventory Staff",
  };
  return labels[role];
}
