"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EXPENSE_CATEGORIES, expenseFormSchema, type ExpenseFormInput } from "@/schemas/expense";
import { PAYMENT_METHODS } from "@/schemas/expense";
import type { ExpenseRow } from "@/repositories/expenses.repository";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: ExpenseRow | null;
  onSaved: () => void;
}

function firstOfNextMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: ExpenseFormInput = {
  category: "",
  description: "",
  amount: 0,
  payment_method: "cash",
  expense_date: today(),
  is_recurring: false,
  frequency: "monthly",
  next_due_date: firstOfNextMonth(),
};

export function ExpenseFormDialog({ open, onOpenChange, editing, onSaved }: ExpenseFormDialogProps) {
  const isEdit = Boolean(editing);

  const form = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: EMPTY,
  });

  // Prefill when switching between create/edit targets.
  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              category: editing.category,
              description: editing.description ?? "",
              amount: editing.amount,
              payment_method: editing.payment_method,
              expense_date: editing.expense_date.slice(0, 10),
              is_recurring: editing.is_recurring,
              frequency: (editing.frequency as ExpenseFormInput["frequency"]) || "monthly",
              next_due_date: editing.next_due_date?.slice(0, 10) ?? firstOfNextMonth(),
            }
          : EMPTY
      );
    }
  }, [open, editing, form]);

  const watchRecurring = useWatch({ control: form.control, name: "is_recurring" });

  async function onSubmit(values: ExpenseFormInput) {
    const res = await fetch(isEdit && editing ? `/api/expenses/${editing.id}` : "/api/expenses", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Could not save the expense");
      return;
    }
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            {isEdit ? "Edit expense" : "Record expense"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the expense details."
              : "Log rent, electricity, salaries and other running costs."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <>
                        <Input {...field} list="expense-categories" placeholder="Rent, Electricity…" />
                        <datalist id="expense-categories">
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid via</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m} className="capitalize">
                              {m === "bank_transfer" ? "Bank transfer" : m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="What is this for?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring */}
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-border">
                  <div className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 size-4 text-primary" />
                    <div>
                      <FormLabel className="font-medium">Recurring expense</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        A template — the due amount is posted automatically on its next due date.
                      </p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchRecurring && (
              <div className="grid gap-4 rounded-xl bg-muted/40 p-3 sm:grid-cols-2 ring-1 ring-border">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeats</FormLabel>
                      <FormControl>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="next_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next due date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Save expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
