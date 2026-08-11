"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, Printer, ReceiptText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { amountInWords, formatCurrency, formatDateTime } from "@/lib/utils";
import type { InvoiceContext } from "@/repositories/store.repository";
import type { CreateSaleResult } from "@/app/api/pos/sales/route";

interface ReceiptLine {
  name: string;
  sku: string;
  qty: number;
  unit_price: number;
  discount: number;
  gst_rate: number;
  line_total: number;
}

interface ReceiptDialogProps {
  sale: CreateSaleResult;
  lines: ReceiptLine[];
  paymentMethod: string;
  amountReceived: number;
  discount: number;
  subtotal: number;
  tax: number;
  customerName?: string | null;
  customerPhone?: string | null;
  payments?: { method: string; amount: number }[];
  notes?: string | null;
  invoiceContext?: InvoiceContext | null;
  /** Reprint mode: shows the sale's original date and a Close action. */
  reprint?: boolean;
  /** Original sale timestamp (used in reprint mode instead of "now"). */
  soldAt?: string | null;
  onClose: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

type Mode = "thermal" | "a4";

export function ReceiptDialog({
  sale,
  lines,
  paymentMethod,
  amountReceived,
  discount,
  subtotal,
  tax,
  customerName,
  customerPhone,
  payments,
  notes,
  invoiceContext,
  reprint = false,
  soldAt,
  onClose,
}: ReceiptDialogProps) {
  const [mode, setMode] = useState<Mode>("thermal");

  const ctx = invoiceContext ?? null;
  const saleDate = soldAt ? new Date(soldAt) : new Date();

  // Per-line GST and a GST-by-rate breakdown (CGST = SGST = half).
  const gstByRate = new Map<number, number>();
  for (const line of lines) {
    const gst = round2((line.unit_price * line.qty - line.discount) * (line.gst_rate / (100 + line.gst_rate)));
    gstByRate.set(line.gst_rate, round2((gstByRate.get(line.gst_rate) ?? 0) + gst));
  }
  const gstGroups = [...gstByRate.entries()].sort((a, b) => a[0] - b[0]);

  const change = Math.max(round2(amountReceived - sale.total), 0);
  const balanceDue = Math.max(round2(sale.total - amountReceived), 0);
  const paymentStatus =
    paymentMethod === "credit" ? (balanceDue > 0 ? "Pending" : "Paid") : balanceDue > 0 ? "Partial" : "Paid";

  const businessName = ctx?.businessName ?? "MediFlow Pharmacy";
  const addressParts = [ctx?.address, ctx?.city, ctx?.state, ctx?.pincode].filter(Boolean).join(", ");
  const contactParts = [ctx?.phone, ctx?.email].filter(Boolean).join(" · ");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-h-[92dvh] overflow-y-auto ${mode === "a4" ? "sm:max-w-3xl" : "sm:max-w-sm"}`}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {reprint ? (
              <ReceiptText className="size-5 text-primary" />
            ) : (
              <CheckCircle2 className="size-5 text-emerald-500" />
            )}
            <DialogTitle>{reprint ? "Invoice" : "Sale complete"}</DialogTitle>
          </div>
          <DialogDescription>
            {sale.invoice_number} · {sale.sale_number}
            {reprint && soldAt ? ` · ${formatDateTime(soldAt)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Layout toggle (never printed) */}
        <div className="no-print flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMode("thermal")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "thermal" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ReceiptText className="size-3.5" /> Receipt · 80mm
            </button>
            <button
              type="button"
              onClick={() => setMode("a4")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "a4" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Invoice · A4
            </button>
          </div>
          <Badge variant="outline">{lines.length} items</Badge>
        </div>

        {/* ── 80mm thermal receipt ─────────────────────────────────────── */}
        {mode === "thermal" && (
          <div className="print-invoice mx-auto w-full max-w-[80mm] bg-white px-3 py-4 text-[11px] leading-snug text-black shadow-card ring-1 ring-border">
            {/* Header */}
            <div className="text-center">
              {ctx?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ctx.logoUrl} alt="" className="mx-auto mb-1 h-10 w-10 object-contain" />
              )}
              <p className="text-sm font-bold uppercase tracking-wide">{businessName}</p>
              {ctx?.legalName && <p className="text-[10px]">{ctx.legalName}</p>}
              {addressParts && <p className="text-[10px]">{addressParts}</p>}
              {ctx?.gstin && <p className="text-[10px]">GSTIN: {ctx.gstin}</p>}
              {ctx?.licenseNumber && <p className="text-[10px]">DL No: {ctx.licenseNumber}</p>}
              {contactParts && <p className="text-[10px]">{contactParts}</p>}
            </div>

            <div className="my-2 border-t border-dashed border-black" />
            <p className="text-center text-xs font-bold tracking-widest">TAX INVOICE</p>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Invoice</span>
                <span className="font-semibold">{sale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span>{formatDateTime(saleDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sale</span>
                <span>{sale.sale_number}</span>
              </div>
              {ctx?.cashierName && (
                <div className="flex justify-between">
                  <span>Cashier</span>
                  <span>{ctx.cashierName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{customerName ?? "Walk-in"}</span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            {/* Items */}
            <table className="w-full">
              <thead>
                <tr className="text-left font-semibold">
                  <th className="pb-0.5">Item</th>
                  <th className="pb-0.5 text-right">Qty</th>
                  <th className="pb-0.5 text-right">Rate</th>
                  <th className="pb-0.5 text-right">Amt</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <Fragment key={i}>
                    <tr>
                      <td colSpan={4} className="pt-1 font-medium">
                        {line.name}
                      </td>
                    </tr>
                    <tr>
                      <td className="pl-2 text-[10px] text-black/60">
                        {line.sku} · GST {line.gst_rate}%
                      </td>
                      <td className="text-right tabular-nums">{line.qty}</td>
                      <td className="text-right tabular-nums">{formatCurrency(line.unit_price)}</td>
                      <td className="text-right font-medium tabular-nums">{formatCurrency(line.line_total)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>

            <div className="my-2 border-t border-dashed border-black" />

            {/* Totals */}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {gstGroups.length > 0 ? (
                gstGroups.map(([rate, gst]) => (
                  <div key={rate} className="flex justify-between">
                    <span>GST ({rate}%)</span>
                    <span className="tabular-nums">{formatCurrency(gst)}</span>
                  </div>
                ))
              ) : (
                tax > 0 && (
                  <div className="flex justify-between">
                    <span>GST</span>
                    <span className="tabular-nums">{formatCurrency(tax)}</span>
                  </div>
                )
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(sale.total)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-1.5">
              {payments && payments.length > 1 ? (
                payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="capitalize">Paid · {p.method}</span>
                    <span className="tabular-nums">{formatCurrency(p.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span className="capitalize">Paid · {paymentMethod}</span>
                  <span className="tabular-nums">{formatCurrency(amountReceived)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(change)}</span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Balance due</span>
                  <span className="tabular-nums">{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>

            {notes && (
              <p className="mt-2 whitespace-pre-line border-t border-dashed border-black pt-1.5">
                <span className="font-semibold">Note:</span> {notes}
              </p>
            )}

            <div className="my-2 border-t border-dashed border-black" />
            {/* Footer */}
            <div className="space-y-0.5 text-center">
              {ctx?.invoiceFooter && (
                <p className="whitespace-pre-line text-[10px] text-black/70">{ctx.invoiceFooter}</p>
              )}
              <p className="text-[10px] font-semibold">Thank you for your purchase!</p>
              <p className="text-[9px] text-black/50">Computer generated · MediFlow AI</p>
            </div>
          </div>
        )}

        {/* ── A4 detailed invoice ──────────────────────────────────────── */}
        {mode === "a4" && (
          <div className="print-invoice mx-auto w-full max-w-[210mm] bg-white p-6 text-xs leading-relaxed text-black shadow-card ring-1 ring-border sm:p-10">
            {/* Brand + meta */}
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  {ctx?.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ctx.logoUrl} alt="" className="h-12 w-12 object-contain" />
                  )}
                  <div>
                    <p className="text-xl font-bold tracking-tight">{businessName}</p>
                    {ctx?.legalName && <p className="text-[11px] text-black/60">{ctx.legalName}</p>}
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-black/70">
                  {addressParts && <p>{addressParts}</p>}
                  {ctx?.gstin && <p>GSTIN: {ctx.gstin}</p>}
                  {ctx?.licenseNumber && <p>Drug License No: {ctx.licenseNumber}</p>}
                  {contactParts && <p>{contactParts}</p>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold uppercase tracking-[0.2em]">Tax Invoice</p>
                <div className="mt-2 ml-auto inline-block space-y-0.5 border border-black/20 p-2 text-left text-[11px]">
                  <p><span className="text-black/50">Invoice No:</span> <span className="font-semibold">{sale.invoice_number}</span></p>
                  <p><span className="text-black/50">Date:</span> {formatDateTime(saleDate)}</p>
                  <p><span className="text-black/50">Sale No:</span> {sale.sale_number}</p>
                  {ctx?.cashierName && <p><span className="text-black/50">Cashier:</span> {ctx.cashierName}</p>}
                  <p><span className="text-black/50">Payment:</span> <span className="capitalize">{paymentMethod} · {paymentStatus}</span></p>
                </div>
              </div>
            </div>

            <div className="my-5 border-t-2 border-black" />

            {/* Bill to */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/50">Bill to</p>
                <p className="mt-0.5 text-sm font-semibold">{customerName ?? "Walk-in Customer"}</p>
                {customerPhone && <p className="text-[11px] text-black/70">Phone: {customerPhone}</p>}
              </div>
              <div className="text-right text-[11px] text-black/60">
                <p>Payment status: <span className="font-semibold text-black">{paymentStatus}</span></p>
              </div>
            </div>

            {/* Items */}
            <table className="mt-4 w-full border-collapse">
              <thead>
                <tr className="border-y-2 border-black text-left text-[10px] uppercase tracking-wider text-black/60">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">Description</th>
                  <th className="py-1.5 pr-2 text-right">Qty</th>
                  <th className="py-1.5 pr-2 text-right">Rate</th>
                  <th className="py-1.5 pr-2 text-right">Disc</th>
                  <th className="py-1.5 pr-2 text-right">GST%</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="break-inside-avoid border-b border-black/15">
                    <td className="py-2 pr-2 text-black/50">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <p className="font-medium">{line.name}</p>
                      <p className="text-[10px] text-black/50">{line.sku}</p>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{line.qty}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(line.unit_price)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {line.discount > 0 ? formatCurrency(line.discount) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{line.gst_rate}%</td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-72 space-y-1">
                <div className="flex justify-between">
                  <span className="text-black/60">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {gstGroups.length > 0 ? (
                  gstGroups.map(([rate, gst]) => {
                    const cgst = round2(gst / 2);
                    const sgst = round2(gst - cgst); // keeps CGST + SGST == GST
                    return (
                      <div key={rate} className="flex justify-between">
                        <span className="text-black/60">GST @ {rate}%</span>
                        <span className="tabular-nums">
                          CGST {formatCurrency(cgst)} + SGST {formatCurrency(sgst)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-black/60">GST</span>
                      <span className="tabular-nums">
                        CGST {formatCurrency(round2(tax / 2))} + SGST {formatCurrency(round2(tax - round2(tax / 2)))}
                      </span>
                    </div>
                  )
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-black/60">Discount</span>
                    <span className="tabular-nums">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-y-2 border-black py-1 text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="tabular-nums">{formatCurrency(sale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Amount received</span>
                  <span className="tabular-nums">{formatCurrency(amountReceived)}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between">
                    <span className="text-black/60">Change</span>
                    <span className="tabular-nums">{formatCurrency(change)}</span>
                  </div>
                )}
                {balanceDue > 0 && (
                  <div className="flex justify-between font-semibold">
                    <span>Balance due</span>
                    <span className="tabular-nums">{formatCurrency(balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-3 text-[11px] italic text-black/70">
              Amount in words: {amountInWords(sale.total)}
            </p>

            {/* Payments breakdown */}
            {payments && payments.length > 1 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/50">Payment breakdown</p>
                <div className="mt-1 inline-flex gap-4 border border-black/20 px-3 py-1.5">
                  {payments.map((p, i) => (
                    <span key={i} className="text-[11px]">
                      <span className="capitalize text-black/60">{p.method}:</span>{" "}
                      <span className="font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {notes && (
              <div className="mt-4 rounded border border-black/15 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/50">Notes</p>
                <p className="mt-0.5 whitespace-pre-line text-[11px]">{notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 border-t border-black pt-3 text-center">
              {ctx?.invoiceFooter && (
                <p className="whitespace-pre-line text-[10px] text-black/60">{ctx.invoiceFooter}</p>
              )}
              <p className="mt-1 text-[11px] font-semibold">Thank you for your business!</p>
              <p className="text-[10px] text-black/50">This is a computer generated invoice · MediFlow AI</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="no-print flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            {reprint ? "Close" : "New sale"}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
