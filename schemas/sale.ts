import { z } from "zod";

export const returnItemSchema = z.object({
  sale_item_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Return quantity must be positive"),
  reason: z.string().trim().max(500, "Reason is too long").optional().nullable(),
});

export const createSaleReturnSchema = z.object({
  items: z.array(returnItemSchema).min(1, "Select at least one item to return"),
  refund_method: z.enum(["cash", "upi", "card", "credit", "bank_transfer"]).default("cash"),
  refund_note: z.string().trim().max(500, "Note is too long").optional().nullable(),
});

export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
