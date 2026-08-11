import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listSuppliers,
} from "@/repositories/suppliers.repository";
import { supplierSchema } from "@/schemas/supplier";

/** GET /api/suppliers — list suppliers with purchase/payment aggregates. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listSuppliers(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/suppliers — create a supplier. */
export async function POST(request: Request) {
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
    .insert({ ...parsed.data, store_id: storeId })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message } },
      { status: 409 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "supplier",
    p_entity_id: data.id,
    p_action: "create",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data }, { status: 201 });
}
