type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

/** Resolve the current user's store id (null when unauthenticated / no store). */
export async function getCurrentStoreId(supabase: Client): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle();
  return data?.store_id ?? null;
}

export interface InvoiceContext {
  businessName: string | null;
  legalName: string | null;
  gstin: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
  invoiceFooter: string | null;
  taxInclusive: boolean;
  thermalPrinter: boolean;
  currency: string;
  cashierName: string | null;
}

/** Business + settings + cashier data that heads/footers the invoice. */
export async function getInvoiceContext(supabase: Client, storeId: string): Promise<InvoiceContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: store }, { data: settings }, { data: profile }] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).maybeSingle(),
    supabase.from("settings").select("*").eq("store_id", storeId).maybeSingle(),
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const s = (settings ?? null) as {
    business_name?: string | null;
    gstin?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    invoice_prefix?: string | null;
    invoice_footer?: string | null;
    tax_inclusive?: boolean | null;
    thermal_printer?: boolean | null;
    currency?: string | null;
  } | null;
  const st = (store ?? null) as {
    name?: string | null;
    legal_name?: string | null;
    gstin?: string | null;
    license_number?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    logo_url?: string | null;
  } | null;

  return {
    businessName: s?.business_name ?? st?.name ?? null,
    legalName: st?.legal_name ?? null,
    gstin: s?.gstin ?? st?.gstin ?? null,
    licenseNumber: st?.license_number ?? null,
    phone: s?.phone ?? st?.phone ?? null,
    email: s?.email ?? st?.email ?? null,
    address: s?.address ?? st?.address ?? null,
    city: st?.city ?? null,
    state: st?.state ?? null,
    pincode: st?.pincode ?? null,
    logoUrl: st?.logo_url ?? null,
    invoicePrefix: s?.invoice_prefix ?? "INV-",
    invoiceFooter: s?.invoice_footer ?? null,
    taxInclusive: s?.tax_inclusive ?? true,
    thermalPrinter: s?.thermal_printer ?? false,
    currency: s?.currency ?? "INR",
    cashierName: ((profile ?? null) as { full_name?: string | null } | null)?.full_name?.trim() || null,
  };
}
