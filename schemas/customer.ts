import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required"),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
  date_of_birth: z.string().trim().optional().or(z.literal("")),
  blood_group: z.string().trim().optional().or(z.literal("")),
  credit_limit: z.coerce.number().min(0, "Credit limit cannot be negative"),
  notes: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const recordCustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["cash", "upi", "card", "credit", "bank_transfer"]).default("cash"),
  reference: z.string().trim().max(100, "Reference is too long").optional().nullable(),
  notes: z.string().trim().max(500, "Notes are too long").optional().nullable(),
});

export type RecordCustomerPaymentInput = z.infer<typeof recordCustomerPaymentSchema>;
