"use client";

import { useState } from "react";
import { Banknote, CreditCard, Landmark, Loader2, Smartphone, UserRound, Wallet } from "lucide-react";
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

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "credit", label: "Credit", icon: UserRound },
  { id: "bank_transfer", label: "Bank transfer", icon: Landmark },
] as const;

interface CustomerPaymentDialogProps {
  customer: { id: string; name: string; outstanding_balance: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: () => void;
}

export function CustomerPaymentDialog({ customer, open, onOpenChange, onRecorded }: CustomerPaymentDialogProps) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const due = customer?.outstanding_balance ?? 0;

  function openChanged(next: boolean) {
    if (!next) {
      onOpenChange(false);
      setAmount(0);
      setReference("");
      setNotes("");
    }
  }

  async function submit() {
    if (!customer) return;
    if (!amount || amount <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    if (amount > due) {
      toast.error(`Amount exceeds the outstanding balance of ${formatCurrency(due)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { applied: number; outstanding_balance: number };
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? "Could not record the payment");
      }
      toast.success(
        json.data.outstanding_balance > 0
          ? `Payment recorded — ${formatCurrency(json.data.outstanding_balance)} still due`
          : "Payment recorded — customer fully settled"
      );
      onRecorded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChanged}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" /> Record payment — {customer?.name}
          </DialogTitle>
          <DialogDescription>
            {formatCurrency(due)} outstanding. Settles the oldest invoices first and updates the customer&apos;s
            balance instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Amount" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder={formatCurrency(due)}
              disabled={submitting}
              autoFocus
            />
          </Field>

          <Field label="Method">
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

          <Field label="Reference">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR no., cheque no.…"
              disabled={submitting}
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              disabled={submitting}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
              {submitting ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
