"use client";

import { useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/form-field";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseOrderDetail } from "@/repositories/purchases.repository";

interface ReceiveDialogProps {
  po: PurchaseOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived: () => void;
}

interface ReceiveLine {
  purchase_item_id: string;
  medicine_id: string;
  medicine_name: string;
  ordered: number;
  received_so_far: number;
  qty: number;
  batch_number: string;
  expiry_date: string;
  cost_price: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
}

export function ReceiveDialog({ po, open, onOpenChange, onReceived }: ReceiveDialogProps) {
  const [lines, setLines] = useState<ReceiveLine[]>(() =>
    po.items.map((i) => ({
      purchase_item_id: i.id,
      medicine_id: i.medicine_id,
      medicine_name: i.medicine_name ?? "Medicine",
      ordered: i.quantity,
      received_so_far: i.received_quantity,
      qty: Math.max(i.quantity - i.received_quantity, 0),
      batch_number: "",
      expiry_date: "",
      cost_price: i.cost_price,
      selling_price: i.selling_price,
      mrp: i.mrp,
      gst_rate: i.gst_rate,
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  function update(index: number, patch: Partial<ReceiveLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  const remainingTotal = lines.reduce((s, l) => s + l.qty * l.cost_price, 0);

  async function submit() {
    const items = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        purchase_item_id: l.purchase_item_id,
        medicine_id: l.medicine_id,
        received_quantity: l.qty,
        batch_number: l.batch_number.trim(),
        expiry_date: l.expiry_date,
        cost_price: l.cost_price,
        selling_price: l.selling_price,
        mrp: l.mrp,
        gst_rate: l.gst_rate,
      }));

    if (items.length === 0) {
      toast.error("Enter a quantity for at least one item");
      return;
    }
    if (items.some((i) => !i.batch_number || !i.expiry_date)) {
      toast.error("Batch number and expiry date are required for every item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/orders/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { status: string };
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? "Could not receive stock");
      }
      toast.success(
        json.data.status === "received"
          ? "Order fully received — stock added to inventory"
          : "Partial receipt recorded — stock added to inventory"
      );
      onReceived();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not receive stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive stock — {po.po_number}</DialogTitle>
          <DialogDescription>
            Enter batch numbers and expiry dates. Stock is added to inventory immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.purchase_item_id} className="space-y-2 rounded-xl p-3 ring-1 ring-border">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.medicine_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordered {l.ordered} · received {l.received_so_far}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(l.cost_price)} / unit
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field label="Receiving">
                  <Input
                    type="number"
                    min={0}
                    max={l.ordered - l.received_so_far}
                    value={l.qty || ""}
                    onChange={(e) => update(i, { qty: Math.max(Number(e.target.value) || 0, 0) })}
                  />
                </Field>
                <Field label="Batch no.">
                  <Input
                    value={l.batch_number}
                    onChange={(e) => update(i, { batch_number: e.target.value })}
                    placeholder="BATCH-01"
                  />
                </Field>
                <Field label="Expiry">
                  <Input
                    type="date"
                    value={l.expiry_date}
                    onChange={(e) => update(i, { expiry_date: e.target.value })}
                  />
                </Field>
                <Field label="Cost (₹)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.cost_price || ""}
                    onChange={(e) => update(i, { cost_price: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm ring-1 ring-border">
          <span className="text-muted-foreground">Value of this receipt</span>
          <span className="font-bold tabular-nums">{formatCurrency(remainingTotal)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
            Receive stock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
