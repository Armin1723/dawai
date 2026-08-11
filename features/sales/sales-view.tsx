"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Eye,
  MoreHorizontal,
  Plus,
  Printer,
  ReceiptText,
  ShoppingBag,
  Undo2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentMethodChip } from "@/components/shared/payment-method-chip";
import { ReturnDialog } from "@/features/sales/return-dialog";
import { ReceiptDialog } from "@/features/pos/receipt-dialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  SaleRow,
  SaleDetail,
} from "@/repositories/sales.repository";
import type { InvoiceContext } from "@/repositories/store.repository";

interface SalesViewProps {
  initialSales: SaleRow[];
  invoiceContext: InvoiceContext | null;
  /** Deep-link filters (?payment_status=, ?status=) so dashboards/reports can drill down. */
  initialPaymentStatus?: string;
  initialStatus?: string;
}

const PAYMENT_STATUSES = ["all", "paid", "partial", "pending", "overdue", "refunded"];
const SALE_STATUSES = ["all", "completed", "held", "returned", "void"];

export function SalesView({ initialSales, invoiceContext, initialPaymentStatus, initialStatus }: SalesViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(
    initialPaymentStatus && initialPaymentStatus !== "all" ? initialPaymentStatus : "all"
  );
  const [saleStatus, setSaleStatus] = useState(
    initialStatus && initialStatus !== "all" ? initialStatus : "all"
  );
  const [detailFor, setDetailFor] = useState<SaleRow | null>(null);
  const [returnFor, setReturnFor] = useState<SaleDetail | null>(null);
  const [printFor, setPrintFor] = useState<SaleDetail | null>(null);

  const { data: sales = initialSales, isLoading } = useQuery({
    queryKey: ["sales", paymentStatus, saleStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentStatus !== "all") params.set("payment_status", paymentStatus);
      if (saleStatus !== "all") params.set("status", saleStatus);
      const res = await fetch(`/api/sales${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("Failed to load sales");
      const json = (await res.json()) as { data?: SaleRow[] };
      return json.data ?? [];
    },
    initialData: initialSales,
  });

  const { data: detail } = useQuery({
    queryKey: ["sale-detail", detailFor?.id],
    enabled: Boolean(detailFor),
    queryFn: async () => {
      const res = await fetch(`/api/sales/${detailFor?.id}`);
      if (!res.ok) throw new Error("Failed to load sale");
      const json = (await res.json()) as { data?: SaleDetail };
      return json.data;
    },
  });

  function handleReturned() {
    void queryClient.invalidateQueries({ queryKey: ["sales"] });
    if (returnFor) {
      void queryClient.invalidateQueries({ queryKey: ["sale-detail", returnFor.id] });
      setReturnFor(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) =>
      `${s.sale_number} ${s.invoice_number ?? ""} ${s.customer_name ?? ""} ${s.payment_method}`
        .toLowerCase()
        .includes(q)
    );
  }, [sales, search]);

  const columns: ColumnDef<SaleRow>[] = [
    {
      accessorKey: "invoice_number",
      header: "Invoice",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="size-3.5" />
            </span>
            <span className="truncate">{row.original.invoice_number ?? row.original.sale_number}</span>
          </p>
          <p className="pl-9 text-xs text-muted-foreground">
            {row.original.sale_number} · {formatDateTime(row.original.sold_at)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customer_id ? (
          <Link
            href={`/customers?customer=${row.original.customer_id}`}
            className="text-sm font-medium underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {row.original.customer_name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Walk-in</span>
        ),
    },
    {
      accessorKey: "item_count",
      header: "Items",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original.item_count ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <PaymentMethodChip method={row.original.payment_method} />,
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => <StatusBadge status={row.original.payment_status} />,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">{formatCurrency(row.original.total)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailFor(row.original)}>
              <Eye className="size-4" /> View invoice
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const res = await fetch(`/api/sales/${row.original.id}`);
                if (!res.ok) {
                  toast.error("Could not load invoice");
                  return;
                }
                const json = (await res.json()) as { data?: SaleDetail };
                if (json.data) setPrintFor(json.data);
              }}
            >
              <Printer className="size-4" /> Print invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={`${sales.length} invoices · ${formatCurrency(
          sales.reduce((s, x) => s + x.total, 0)
        )} total revenue shown`}
        actions={
          <Button asChild>
            <Link href="/pos">
              <Plus className="size-4" /> New sale
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: ShoppingBag,
          title: "No sales found",
          description: search || paymentStatus !== "all" || saleStatus !== "all"
            ? "Try adjusting your search or filters."
            : "Complete a checkout in POS and the invoice will appear here.",
        }}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onSearch={setSearch}
              placeholder="Search invoice, customer, method…"
              className="sm:w-80"
            />
            <div className="flex items-center gap-2">
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s === "all" ? "All payments" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={saleStatus} onValueChange={setSaleStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s === "all" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {/* Detail dialog */}
      <Dialog open={Boolean(detailFor)} onOpenChange={(open) => !open && setDetailFor(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-4 text-primary" />
              {detail?.invoice_number ?? detailFor?.invoice_number ?? detailFor?.sale_number}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>{detail?.sale_number ?? detailFor?.sale_number}</span>
              {detail && (
                <>
                  <StatusBadge status={detail.status} />
                  <StatusBadge status={detail.payment_status} />
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {!detail ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="data-skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {detail.customer_id ? (
                    <Link
                      href={`/customers?customer=${detail.customer_id}`}
                      className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {detail.customer_name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">Walk-in</span>
                  )}
                  · {formatDateTime(detail.sold_at)}
                </div>
                <PaymentMethodChip method={detail.payment_method} />
              </div>

              {/* Items */}
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl shadow-card ring-1 ring-border">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.medicine_name ?? "Medicine"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                        {item.discount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {" "}
                            · −{formatCurrency(item.discount)} off
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(item.line_total)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Totals */}
              <div className="space-y-1 rounded-xl p-3 text-sm shadow-card ring-1 ring-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span>
                  <span className="tabular-nums">{formatCurrency(detail.tax_amount)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">−{formatCurrency(detail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(detail.total)}</span>
                </div>
                {detail.status !== "returned" && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cost of goods</span>
                    <span className="tabular-nums">{formatCurrency(detail.cost_of_goods)}</span>
                  </div>
                )}
                {detail.status !== "returned" && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(detail.profit)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payments */}
              {detail.payments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Payments</p>
                  {detail.payments.map((p) => {
                    const isRefund = p.amount < 0 || p.status === "refunded";
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 ring-border"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {formatDateTime(p.paid_at)}
                          {p.reference && <span className="text-xs">· {p.reference}</span>}
                          {isRefund && (
                            <StatusBadge status="refunded" />
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <PaymentMethodChip method={p.method} />
                          <span
                            className={`font-medium tabular-nums ${
                              isRefund
                                ? "text-rose-600 dark:text-rose-400"
                                : ""
                            }`}
                          >
                            {isRefund ? `−${formatCurrency(Math.abs(p.amount))}` : formatCurrency(p.amount)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Prior returns */}
              {detail.returns.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Returns</p>
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl bg-rose-500/5 ring-1 ring-rose-500/20">
                    {detail.returns.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {r.medicine_name ?? "Medicine"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.quantity} returned · {formatDateTime(r.created_at)}
                            {r.reason && <span> · “{r.reason}”</span>}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatCurrency(r.refund_amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {detail.status === "completed" && (
                  <Button variant="destructive" onClick={() => setReturnFor(detail)}>
                    <Undo2 className="size-4" /> Return items
                  </Button>
                )}
                <Button variant="outline" onClick={() => setPrintFor(detail)}>
                  <Printer className="size-4" /> Print invoice
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/pos">Back to POS</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Return / refund dialog */}
      <ReturnDialog sale={returnFor} open={Boolean(returnFor)} onOpenChange={(open) => !open && setReturnFor(null)} onReturned={handleReturned} />

      {/* Reprint dialog */}
      {printFor && <SalePrintDialog sale={printFor} invoiceContext={invoiceContext} onClose={() => setPrintFor(null)} />}
    </div>
  );
}

function SalePrintDialog({
  sale,
  invoiceContext,
  onClose,
}: {
  sale: SaleDetail;
  invoiceContext: InvoiceContext | null;
  onClose: () => void;
}) {
  const positivePayments = sale.payments.filter((p) => p.amount > 0);
  const amountReceived = positivePayments.reduce((sum, p) => sum + p.amount, 0);
  return (
    <ReceiptDialog
      reprint
      soldAt={sale.sold_at}
      sale={{
        sale_id: sale.id,
        sale_number: sale.sale_number,
        invoice_id: sale.invoice_id ?? "",
        invoice_number: sale.invoice_number ?? sale.sale_number,
        total: sale.total,
        items: sale.items.length,
      }}
      lines={sale.items.map((i) => ({
        name: i.medicine_name ?? "Medicine",
        sku: i.sku ?? "",
        qty: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount,
        gst_rate: i.gst_rate,
        line_total: i.line_total,
      }))}
      paymentMethod={sale.payment_method}
      amountReceived={amountReceived}
      discount={sale.discount}
      subtotal={sale.subtotal}
      tax={sale.tax_amount}
      customerName={sale.customer_name}
      customerPhone={sale.customer_phone}
      payments={positivePayments.map((p) => ({ method: p.method, amount: p.amount }))}
      notes={sale.notes}
      invoiceContext={invoiceContext}
      onClose={onClose}
    />
  );
}
