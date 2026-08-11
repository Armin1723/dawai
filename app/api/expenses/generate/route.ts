import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  generateDueExpenses,
} from "@/repositories/expenses.repository";

/** POST /api/expenses/generate — instantiate all due recurring expenses. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in first" } },
      { status: 401 }
    );
  }

  try {
    const data = await generateDueExpenses(supabase, storeId, user.id);

    await supabase.rpc("write_audit_log", {
      p_entity: "expense",
      p_entity_id: data.expense_ids[0] ?? null,
      p_action: "generate_recurring",
      p_after: { generated: data.generated },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[expenses/generate] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not generate due expenses. Please try again." } },
      { status: 500 }
    );
  }
}
