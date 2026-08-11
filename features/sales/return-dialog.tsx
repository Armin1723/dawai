"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  PackageX,
  Plus,
  Smartphone,
  Undo2,
  UserRound,
  Wallet,
} from "lucide-react";
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
import type { SaleDetail, SaleReturnResult } from "@/repositories/sales.repository";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "credit", label: "Credit", icon: UserRound },
  { id: "bank_transfer", label: "Bank transfer", icon: Landmark },
] as const;

interface ReturnDialogProps {
  sale: SaleDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturned: () => void;
}

export function ReturnDialog({ sale, open, onOpenChange, onReturned }: ReturnDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Remaining returnable per line = sold − already returned.
  const returnedByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of sale?.returns ?? []) {
      if (!r.sale_item_id) continue;
      map.set(r.sale_item_id, (map.get(r.sale_item_id) ?? 0) + r.quantity);
    }
    return map;
  }, [sale]);

  const maxQty = (itemId: string, sold: number) =>
    Math.max(0, sold - (returnedByItem.get(itemId) ?? 0));

  const selectedCount = sale?.items.filter((i) => (quantities[i.id] ?? 0) > 0).length ?? 0;

  // Mirror the RPC's refund math: share of line gross, with the sale-level
  // discount allocated proportionally.
  const refundEstimate = useMemo(() => {
    if (!sale) return 0;
    const gross = sale.items.reduce((sum, i) => sum + i.line_total, 0);
    const share = sale.items.reduce((sum, i) => {
      const qty = quantities[i.id] ?? 0;
      if (qty <= 0 || i.quantity <= 0) return sum;
      return sum + i.line_total * (qty / i.quantity);
    }, 0);
    const total = sale.discount > 0 && gross > 0 ? share - sale.discount * (share / gross) : share;
    return Math.max(0, Math.round(total * 100) / 100);
  }, [sale, quantities]);

  const allReturnable = sale?.items.every((i) => maxQty(i.id, i.quantity) > 0) ?? false;

  function openChanged(next: boolean) {
    if (!next) {
      onOpenChange(false);
      setQuantities({});
      setReasons({});
      setMethod("cash");
      setNote("");
    }
  }

  function setQty(itemId: string, value: number, sold: number) {
    const max = maxQty(itemId, sold);
    setQuantities((q) => ({ ...q, [itemId]: Math.min(Math.max(0, Math.round(value) || 0), max) }));
  }

  function returnAll() {
    if (!sale) return;
    const all: Record<string, number> = {};
    for (const i of sale.items) all[i.id] = maxQty(i.id, i.quantity);
    setQuantities(all);
  }

  async function submit() {
    if (!sale) return;
    const items = sale.items
      .filter((i) => (quantities[i.id] ?? 0) > 0)
      .map((i) => ({
        sale_item_id: i.id,
        quantity: quantities[i.id]!,
        reason: reasons[i.id]?.trim() || null,
      }));
    if (items.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (method === "credit" && sale.customer_id === null) {
      toast.error("Credit refunds require a customer on the sale");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          refund_method: method,
          refund_note: note.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: SaleReturnResult;
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? "Could not process the return");
      }
      toast.success(
        json.data.full_return
          ? `Sale fully returned — ${formatCurrency(json.data.refund_amount)} refunded`
          : `Return processed — ${formatCurrency(json.data.refund_amount)} refunded`
      );
      onReturned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process the return");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChanged}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-4 text-primary" /> Return items
          </DialogTitle>
          <DialogDescription>
            {sale?.invoice_number ?? sale?.sale_number} — stock is restored to the batch it was sold from and the
            refund is issued for the returned lines.
          </DialogDescription>
        </DialogHeader>

        {!sale ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="data-skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {allReturnable && selectedCount === 0 && (
              <button
                type="button"
                onClick={returnAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <PackageX className="size-4" /> Return the entire sale
              </button>
            )}

            {/* Line items */}
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl shadow-card ring-1 ring-border">
              {sale.items.map((item) => {
                const max = maxQty(item.id, item.quantity);
                const qty = quantities[item.id] ?? 0;
                const alreadyReturned = item.quantity - max;
                return (
                  <li key={item.id} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.medicine_name ?? "Medicine"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sold {item.quantity} × {formatCurrency(item.unit_price)}
                          {alreadyReturned > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {" "}
                              · {alreadyReturned} already returned
                            </span>
                          )}
                        </p>
                      </div>
                      {max > 0 ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7"
                            disabled={qty <= 0}
                            onClick={() => setQty(item.id, qty - 1, item.quantity)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            max={max}
                            value={qty || ""}
                            onChange={(e) => setQty(item.id, Number(e.target.value), item.quantity)}
                            className="h-7 w-14 px-1 text-center tabular-nums"
                            disabled={submitting}
                            aria-label={`Return quantity for ${item.medicine_name}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7"
                            disabled={qty >= max}
                            onClick={() => setQty(item.id, qty + 1, item.quantity)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Fully returned
                        </span>
                      )}
                    </div>
                    {qty > 0 && (
                      <Input
                        value={reasons[item.id] ?? ""}
                        onChange={(e) =>
                          setReasons((r) => ({ ...r, [item.id]: e.target.value }))
                        }
                        placeholder="Reason for return (optional)"
                        className="h-8 text-xs"
                        disabled={submitting}
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Refund details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Refund method" required>
                <Select value={method} onValueChange={setMethod} disabled={submitting}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map(({ id, label, icon: Icon }) => (
                      <SelectItem key={id} value={id}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
                <p className="text-xs text-muted-foreground">Refund estimate</p>
                <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  −{formatCurrency(refundEstimate)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedCount === 0 ? "Nothing selected" : `${selectedCount} line${selectedCount === 1 ? "" : "s"} · GST-inclusive`}
                </p>
              </div>
            </div>

            {method === "credit" && (
              <p className="flex items-start gap-2 rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                <Wallet className="mt-0.5 size-3.5 shrink-0" />
                The refund stays on the customer&apos;s account and reduces their outstanding balance — no cash changes
                hands.
              </p>
            )}

            <Field label="Refund note">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional note shown on the receipt record"
                disabled={submitting}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={submit}
                disabled={submitting || selectedCount === 0}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                {submitting ? "Processing…" : `Process return · ${formatCurrency(refundEstimate)}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
