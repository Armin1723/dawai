"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { batchSchema, type BatchInput } from "@/schemas/medicine";

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicineId: string;
  medicineName: string;
  onSaved: () => void;
}

export function BatchDialog({ open, onOpenChange, medicineId, medicineName, onSaved }: BatchDialogProps) {
  const form = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      medicine_id: medicineId,
      batch_number: "",
      expiry_date: "",
      purchase_price: 0,
      selling_price: 0,
      mrp: 0,
      quantity: 0,
    },
  });

  useEffect(() => {
    if (open) form.reset({ medicine_id: medicineId, batch_number: "", expiry_date: "", purchase_price: 0, selling_price: 0, mrp: 0, quantity: 0 });
  }, [open, medicineId, form]);

  const submitting = form.formState.isSubmitting;

  async function onSubmit(values: BatchInput) {
    try {
      const res = await fetch("/api/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { data?: unknown; error?: { message: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? "Could not add batch");
      toast.success("Stock added");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add batch");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add stock — {medicineName}</DialogTitle>
          <DialogDescription>
            Enter a batch to receive stock. Inventory updates automatically (FEFO by expiry date).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="batch_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch number *</FormLabel>
                  <FormControl>
                    <Input placeholder="BATCH-2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Add stock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
