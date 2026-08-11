import { z } from "zod";

export const poItemSchema = z.object({
  medicine_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  selling_price: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  gst_rate: z.coerce.number().min(0).max(100),
});

export const createPoSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  items: z.array(poItemSchema).min(1, "Add at least one item"),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type CreatePoInput = z.infer<typeof createPoSchema>;

export const receiveItemSchema = z.object({
  purchase_item_id: z.string().uuid(),
  medicine_id: z.string().uuid(),
  received_quantity: z.coerce.number().positive("Received quantity must be positive"),
  batch_number: z.string().trim().min(1, "Batch number is required"),
  expiry_date: z.string().min(1, "Expiry date is required"),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  gst_rate: z.coerce.number().min(0).max(100),
});

export const receivePoSchema = z.object({
  items: z.array(receiveItemSchema).min(1, "Nothing to receive"),
});

export type ReceivePoInput = z.infer<typeof receivePoSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["cash", "upi", "card", "credit", "bank_transfer"]).default("cash"),
  reference: z.string().trim().max(100, "Reference is too long").optional().nullable(),
  notes: z.string().trim().max(500, "Notes are too long").optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
