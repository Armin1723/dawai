import { z } from "zod";

export const posItemSchema = z.object({
  medicine_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit_price: z.coerce.number().min(0),
  gst_rate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).default(0),
});

export const posSplitPaymentSchema = z.object({
  method: z.enum(["cash", "upi", "card"]),
  amount: z.coerce.number().min(0, "Payment amount must be positive"),
});

export const posSaleSchema = z
  .object({
    items: z.array(posItemSchema).min(1, "Cart is empty"),
    discount: z.coerce.number().min(0).default(0),
    payment_method: z.enum(["cash", "upi", "card", "credit"]),
    amount_received: z.coerce.number().min(0).default(0),
    customer_id: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    // Optional split tender: [{method, amount}, ...]. When present it
    // supersedes payment_method + amount_received on the server.
    payments: z.array(posSplitPaymentSchema).max(3).optional(),
  })
  .refine(
    (v) => !v.payments || v.payments.length === 0 || v.payments.some((p) => p.amount > 0),
    { message: "Split payment amounts must total more than zero", path: ["payments"] }
  );

export type PosSaleInput = z.infer<typeof posSaleSchema>;
