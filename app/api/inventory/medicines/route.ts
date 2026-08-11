import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listMedicines,
} from "@/repositories/inventory.repository";
import { medicineSchema } from "@/schemas/medicine";

/** GET /api/inventory/medicines — list medicines with live stock status. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listMedicines(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/inventory/medicines — create a medicine for the caller's store. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = medicineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("medicines")
    .insert({ ...parsed.data, store_id: storeId })
    .select("id, name, sku")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message } },
      { status: 409 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "medicine",
    p_entity_id: data.id,
    p_action: "create",
    p_after: { name: data.name, sku: data.sku },
  });

  return NextResponse.json({ data }, { status: 201 });
}
