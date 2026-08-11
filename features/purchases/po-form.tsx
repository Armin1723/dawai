"use client";

import { useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/form-field";
import { formatCurrency } from "@/lib/utils";
import type { SupplierRow } from "@/repositories/suppliers.repository";
import type { PoMedicineOption } from "@/repositories/purchases.repository";

interface Line {
  medicine: PoMedicineOption;
  quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
}

interface PoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: SupplierRow[];
  medicines: PoMedicineOption[];
  onSaved: () => void;
}

export function PoForm({ open, onOpenChange, suppliers, medicines, onSaved }: PoFormProps) {
  const [supplierId, setSupplierId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);

  // GST-inclusive math (mirrors create_purchase_order)
  const totals = lines.reduce(
    (acc, l) => {
      const lineTotal = l.quantity * l.cost_price;
      const gst = Math.round((lineTotal * l.gst_rate) / (100 + l.gst_rate) * 100) / 100;
      acc.subtotal += lineTotal - gst;
      acc.tax += gst;
      acc.total += lineTotal;
      return acc;
    },
    { subtotal: 0, tax: 0, total: 0 }
  );
  const grandTotal = Math.max(totals.total - discount, 0);

  function addLine(medicine: PoMedicineOption) {
    setLines((prev) => [...prev, {
      medicine,
      quantity: 1,
      cost_price: medicine.purchase_price || medicine.selling_price,
      selling_price: medicine.selling_price,
      mrp: medicine.mrp,
      gst_rate: medicine.gst_rate,
    }]);
    setPickFor(null);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!supplierId) {
      toast.error("Choose a supplier");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          items: lines.map((l) => ({
            medicine_id: l.medicine.id,
            quantity: l.quantity,
            cost_price: l.cost_price,
            selling_price: l.selling_price,
            mrp: l.mrp,
            gst_rate: l.gst_rate,
          })),
          discount,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { data?: { po_number: string; total: number }; error?: { message: string } }
        | null;
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? "Could not create purchase order");
      }
      toast.success(`Purchase order ${json.data.po_number} created (${formatCurrency(json.data.total)})`);
      setSupplierId("");
      setLines([]);
      setDiscount(0);
      setNotes("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create purchase order");
    } finally {
      setSubmitting(false);
    }
  }

  const available = medicines.filter(
    (m) => !lines.some((l) => l.medicine.id === m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>
            Order stock from a supplier. Quantities are added to inventory when you receive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Supplier" required>
            <Select value={supplierId || undefined} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Items *</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickFor(lines.length)}>
                <Plus className="size-3.5" /> Add item
              </Button>
            </div>

            {lines.length === 0 && (
              <p className="rounded-xl border border-dashed border-foreground/15 py-6 text-center text-sm text-muted-foreground">
                No items yet — click “Add item” to pick medicines.
              </p>
            )}

            {lines.map((l, i) => (
              <div key={l.medicine.id} className="space-y-2 rounded-xl p-3 ring-1 ring-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.medicine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.medicine.sku} · stock {l.medicine.current_stock}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Qty">
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity || ""}
                      onChange={(e) => updateLine(i, { quantity: Math.max(Number(e.target.value) || 0, 0) })}
                    />
                  </Field>
                  <Field label="Cost (₹)">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.cost_price || ""}
                      onChange={(e) => updateLine(i, { cost_price: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Sell (₹)">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.selling_price || ""}
                      onChange={(e) => updateLine(i, { selling_price: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="GST %">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={l.gst_rate || ""}
                      onChange={(e) => updateLine(i, { gst_rate: Number(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {/* Medicine picker */}
          {pickFor !== null && (
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3 ring-1 ring-border">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search medicines…"
                  className="pl-9"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    // Filter inline on the passed list (client-side for simplicity)
                    const match = available.find(
                      (m) => m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q)
                    );
                    if (match && q.length > 0) addLine(match);
                  }}
                />
              </div>
              <div className="max-h-44 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    All medicines already added.
                  </p>
                ) : (
                  available.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addLine(m)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <span className="truncate">
                        {m.name} <span className="text-xs text-muted-foreground">· {m.sku}</span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(m.selling_price)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 rounded-xl p-3 text-sm shadow-card ring-1 ring-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (excl. GST)</span>
              <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST</span>
              <span className="tabular-nums">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 w-28 text-right"
                placeholder="₹0"
                aria-label="Discount"
              />
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes (optional)"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
