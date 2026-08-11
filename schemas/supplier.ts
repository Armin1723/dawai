import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name is required"),
  gstin: z.string().trim().optional().or(z.literal("")),
  contact_person: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
  opening_balance: z.coerce.number().min(0),
  notes: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
