import { z } from "zod";

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const medicineSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required"),
  generic_name: z.string().trim().optional().nullable(),
  sku: z.string().trim().min(1, "SKU is required"),
  barcode: z.string().trim().optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),
  manufacturer_id: z.string().uuid().nullable().optional(),
  composition: z.string().trim().optional().nullable(),
  strength: z.string().trim().optional().nullable(),
  dosage_form: z.string().trim().optional().nullable(),
  hsn_code: z.string().trim().optional().nullable(),
  gst_rate: z.coerce.number().refine((v) => (GST_RATES as readonly number[]).includes(v), {
    message: "Select a valid GST rate",
  }),
  mrp: z.coerce.number().min(0, "MRP cannot be negative"),
  purchase_price: z.coerce.number().min(0, "Purchase price cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  // NOTE: avoid `.default()` here — it widens the input type and breaks the
  // zodResolver ↔ useForm generic pairing. Defaults live in `defaultValues`.
  min_stock: z.coerce.number().min(0, "Min stock cannot be negative"),
  max_stock: z.coerce.number().min(0).nullable().optional(),
  location: z.string().trim().optional().nullable(),
  is_prescription_required: z.boolean(),
  is_active: z.boolean(),
});

export type MedicineInput = z.infer<typeof medicineSchema>;

export const batchSchema = z.object({
  medicine_id: z.string().uuid(),
  batch_number: z.string().trim().min(1, "Batch number is required"),
  expiry_date: z.string().min(1, "Expiry date is required"),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  received_date: z.string().optional().nullable(),
});

export type BatchInput = z.infer<typeof batchSchema>;
