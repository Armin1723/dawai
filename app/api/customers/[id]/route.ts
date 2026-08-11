import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStoreId, getCustomerDetail } from "@/repositories/customers.repository";
import { customerSchema } from "@/schemas/customer";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/customers/[id] — purchase history + payments for a customer. */
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
  const data = await getCustomerDetail(supabase, storeId, id);
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Customer not found" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ data });
}

/** PATCH /api/customers/[id] — update a customer. */
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

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...parsed.data,
      email: parsed.data.email?.trim() ? parsed.data.email : null,
      phone: parsed.data.phone?.trim() ? parsed.data.phone : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Customer not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "customer",
    p_entity_id: data.id,
    p_action: "update",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data });
}

/** DELETE /api/customers/[id] — soft-deactivate a customer. */
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
    .from("customers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Customer not found" } },
      { status: 404 }
    );
  }

  await supabase.rpc("write_audit_log", {
    p_entity: "customer",
    p_entity_id: data.id,
    p_action: "deactivate",
    p_after: { name: data.name },
  });

  return NextResponse.json({ data });
}
