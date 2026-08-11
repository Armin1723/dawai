import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId } from "@/repositories/inventory.repository";
import { batchSchema } from "@/schemas/medicine";

/** POST /api/inventory/batches — receive stock into a batch. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("medicine_batches")
    .upsert(
      {
        ...parsed.data,
        store_id: storeId,
        received_date: parsed.data.received_date ?? new Date().toISOString().slice(0, 10),
      },
      { onConflict: "store_id,medicine_id,batch_number", ignoreDuplicates: false }
    )
    .select("id, batch_number, quantity")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message } },
      { status: 409 }
    );
  }

  // The medicine_batches trigger keeps `inventory.quantity` in sync.
  await supabase.rpc("write_audit_log", {
    p_entity: "medicine_batch",
    p_entity_id: data.id,
    p_action: "stock-in",
    p_after: { batch: data.batch_number, qty: data.quantity },
  });

  return NextResponse.json({ data }, { status: 201 });
}
