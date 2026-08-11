import { redirect } from "next/navigation";
import { getSession, createSupabaseServerClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarNav, SidebarLogo, SidebarFooter } from "@/components/layout/app-sidebar";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasKeys = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let userEmail = "demo@mediflow.app";
  let userName: string | null = "Demo User";
  let userRole: UserRole | null = "owner";

  if (hasKeys) {
    const session = await getSession();
    if (!session) redirect("/login");
    userEmail = session.user.email ?? "";
    userName = (session.user.user_metadata?.full_name as string | undefined) ?? null;

    // Fetch the profile for role info (graceful if the DB isn't ready).
    try {
      const supabase = await createSupabaseServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.role) userRole = profile.role as UserRole;
    } catch {
      userRole = null;
    }
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <SidebarLogo />
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Ambient brand wash — signage glow, not decoration.*/}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(65%_100%_at_50%_-10%,oklch(0.5_0.1_195/0.08),transparent)] dark:bg-[radial-gradient(65%_100%_at_50%_-10%,oklch(0.74_0.1_190/0.09),transparent)]"
        />
        <AppHeader userEmail={userEmail} userName={userName} userRole={userRole} />
        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
