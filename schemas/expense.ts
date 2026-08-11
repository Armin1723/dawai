import { z } from "zod";

/** Quick-pick categories shown as suggestions + chips (free entry allowed). */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Salary",
  "Staff Wages",
  "Maintenance",
  "Marketing",
  "Software",
  "Misc",
] as const;

export const PAYMENT_METHODS = ["cash", "upi", "card", "credit", "bank_transfer"] as const;

export const expenseFormSchema = z
  .object({
    category: z.string().trim().min(1, "Category is required"),
    description: z.string().trim().optional().or(z.literal("")),
    amount: z.coerce.number().positive("Amount must be positive"),
    payment_method: z.enum(PAYMENT_METHODS),
    expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
    is_recurring: z.boolean(),
    frequency: z.enum(["monthly", "quarterly", "yearly"]).optional().or(z.literal("")),
    next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.is_recurring) {
      if (!val.frequency) {
        ctx.addIssue({ code: "custom", path: ["frequency"], message: "Choose how often this repeats" });
      }
      if (!val.next_due_date) {
        ctx.addIssue({ code: "custom", path: ["next_due_date"], message: "Set the next due date" });
      }
    }
  });

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
