import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  getSupplierTransactions,
} from "@/repositories/suppliers.repository";
import { supplierSchema } from "@/schemas/supplier";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/suppliers/[id] — purchase history for a supplier. */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await getSupplierTransactions(supabase, storeId, id);
  return NextResponse.json({ data });
}

/** PATCH /api/suppliers/[id] — update a supplier. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = supplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "supplier",
    p_entity_id: data.id,
    p_action: "update",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data });
}

/** DELETE /api/suppliers/[id] — soft-deactivate a supplier. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "supplier",
    p_entity_id: data.id,
    p_action: "deactivate",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data });
}
