import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId } from "@/repositories/inventory.repository";
import { medicineSchema } from "@/schemas/medicine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/inventory/medicines/:id — update a medicine (partial allowed). */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = medicineSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("medicines")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name, sku")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: error.message } },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Medicine not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "medicine",
    p_entity_id: id,
    p_action: "update",
    p_after: { name: data.name, sku: data.sku },
  });

  return NextResponse.json({ data });
}

/** DELETE /api/inventory/medicines/:id — soft-delete a medicine. */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("medicines")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: error.message } },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Medicine not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "medicine",
    p_entity_id: id,
    p_action: "deactivate",
  });

  return NextResponse.json({ data });
}
