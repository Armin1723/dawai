import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentStoreId,
  listPurchaseOrders,
} from "@/repositories/purchases.repository";
import { createPoSchema } from "@/schemas/purchase";

/** GET /api/purchases/orders — list purchase orders. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listPurchaseOrders(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/purchases/orders — create a purchase order (atomic RPC). */
export async function POST(request: Request) {
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

  const parsed = createPoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Generated types mark nullable function params as `string`; the DB accepts
  // null for notes, so cast the args object loosely.
  const { data, error } = await supabase.rpc(
    "create_purchase_order",
    {
      p_store_id: storeId,
      p_supplier_id: body.supplier_id,
      p_created_by: user.id,
      p_items: body.items.map((i) => ({
        medicine_id: i.medicine_id,
        quantity: i.quantity,
        cost_price: i.cost_price,
        selling_price: i.selling_price ?? i.cost_price,
        mrp: i.mrp ?? i.cost_price,
        gst_rate: i.gst_rate,
      })),
      p_discount: body.discount,
      p_notes: body.notes ?? null,
    } as never
  );

  if (error) {
    console.error("[purchases/orders] create_purchase_order failed:", error.message);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Could not create the purchase order. Please try again." } },
      { status: 500 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "purchase_order",
    p_entity_id: (data as { po_id: string }).po_id,
    p_action: "create",
    p_after: { po_number: (data as { po_number: string }).po_number },
  });

  return NextResponse.json({ data }, { status: 201 });
}
