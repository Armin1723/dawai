import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, listCustomers } from "@/repositories/customers.repository";
import { customerSchema } from "@/schemas/customer";

/** GET /api/customers — list customers with purchase aggregates. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }
  const data = await listCustomers(supabase, storeId);
  return NextResponse.json({ data });
}

/** POST /api/customers — create a customer. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const storeId = await getCurrentStoreId(supabase);
  if (!storeId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in and join a store first" } },
      { status: 401 }
    );
  }

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...parsed.data,
      store_id: storeId,
      email: parsed.data.email?.trim() ? parsed.data.email : null,
      phone: parsed.data.phone?.trim() ? parsed.data.phone : null,
    })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message } },
      { status: 409 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "customer",
    p_entity_id: data.id,
    p_action: "create",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data }, { status: 201 });
}
