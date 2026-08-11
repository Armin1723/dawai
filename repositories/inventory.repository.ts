type Client = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

export { getCurrentStoreId } from "@/repositories/store.repository";

export interface MedicineListItem {
  medicine_id: string;
  name: string;
  generic_name: string | null;
  sku: string;
  barcode: string | null;
  mrp: number;
  selling_price: number;
  purchase_price: number;
  gst_rate: number;
  min_stock: number;
  location: string | null;
  is_active: boolean;
  current_stock: number;
  stock_value: number;
  stock_status: "in stock" | "low" | "out of stock";
  earliest_expiry: string | null;
  expiry_status: "ok" | "near expiry" | "expired";
}

export async function listMedicines(supabase: Client, storeId: string): Promise<MedicineListItem[]> {
  const { data } = await supabase
    .from("v_inventory_status")
    .select(
      "medicine_id, name, sku, barcode, mrp, selling_price, purchase_price, gst_rate, min_stock, location, is_active, current_stock, stock_value, stock_status, earliest_expiry, expiry_status"
    )
    .eq("store_id", storeId)
    .order("name");

  return (data ?? []) as unknown as MedicineListItem[];
}

export interface CategoryOption {
  id: string;
  name: string;
}

export async function listCategories(supabase: Client, storeId: string): Promise<CategoryOption[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .order("name");
  return (data ?? []) as CategoryOption[];
}

export interface ManufacturerOption {
  id: string;
  name: string;
}

export async function listManufacturers(
  supabase: Client,
  storeId: string
): Promise<ManufacturerOption[]> {
  const { data } = await supabase
    .from("manufacturers")
    .select("id, name")
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .order("name");
  return (data ?? []) as ManufacturerOption[];
}

export interface BatchDetail {
  id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  received_date: string | null;
}

export async function listBatches(
  supabase: Client,
  medicineId: string
): Promise<BatchDetail[]> {
  const { data } = await supabase
    .from("medicine_batches")
    .select(
      "id, medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, mrp, received_date"
    )
    .eq("medicine_id", medicineId)
    .order("expiry_date", { ascending: true });

  return (data ?? []) as BatchDetail[];
}

export async function getMedicine(
  supabase: Client,
  storeId: string,
  medicineId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("medicines")
    .select("*")
    .eq("id", medicineId)
    .eq("store_id", storeId)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}
