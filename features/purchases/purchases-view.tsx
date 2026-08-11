"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  ClipboardList,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ReceiptText,
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
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PoForm } from "@/features/purchases/po-form";
import { ReceiveDialog } from "@/features/purchases/receive-dialog";
import { PaymentDialog } from "@/features/purchases/payment-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PurchaseOrderRow, PurchaseOrderDetail, PoMedicineOption } from "@/repositories/purchases.repository";
import type { SupplierRow } from "@/repositories/suppliers.repository";

interface PurchasesViewProps {
  initialOrders: PurchaseOrderRow[];
  suppliers: SupplierRow[];
  medicines: PoMedicineOption[];
}

export function PurchasesView({ initialOrders, suppliers, medicines }: PurchasesViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<PurchaseOrderRow | null>(null);
  const [receiveFor, setReceiveFor] = useState<PurchaseOrderDetail | null>(null);
  const [paymentFor, setPaymentFor] = useState<{ id: string; po_number: string; due: number } | null>(null);

  const { data: orders = initialOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/orders");
      if (!res.ok) throw new Error("Failed to load purchase orders");
      const json = (await res.json()) as { data?: PurchaseOrderRow[] };
      return json.data ?? [];
    },
    initialData: initialOrders,
  });

  const { data: detail } = useQuery({
    queryKey: ["purchase-order", detailFor?.id],
    enabled: Boolean(detailFor) && !receiveFor,
    queryFn: async () => {
      const res = await fetch(`/api/purchases/orders/${detailFor?.id}`);
      if (!res.ok) throw new Error("Failed to load order");
      const json = (await res.json()) as { data?: PurchaseOrderDetail };
      return json.data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.po_number} ${o.supplier_name ?? ""} ${o.status}`.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const columns: ColumnDef<PurchaseOrderRow>[] = [
    {
      accessorKey: "po_number",
      header: "Order",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-3.5" />
            </span>
            <span className="truncate">{row.original.po_number}</span>
          </p>
          <p className="pl-9 text-xs text-muted-foreground">
            {formatDate(row.original.order_date)}
            {row.original.item_count != null && ` · ${row.original.item_count} items`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.supplier_name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.original.total)}</span>
      ),
    },
    {
      accessorKey: "due",
      header: "Due",
      cell: ({ row }) => (
        <span
          className={
            row.original.due > 0
              ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400"
              : "tabular-nums text-muted-foreground"
          }
        >
          {formatCurrency(row.original.due)}
        </span>
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
              <Eye className="size-4" /> View order
            </DropdownMenuItem>
            {(row.original.status === "ordered" || row.original.status === "partial") && (
              <DropdownMenuItem onClick={() => setDetailFor(row.original)}>
                <PackageCheck className="size-4" /> Receive stock
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const receiveTarget = receiveFor ?? (detail && detailFor && detail.id === detailFor.id ? detail : null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description={`${orders.length} purchase orders · ${formatCurrency(
          orders.reduce((s, o) => s + o.due, 0)
        )} outstanding to suppliers`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> New purchase order
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: ClipboardList,
          title: "No purchase orders",
          description: search
            ? "Try adjusting your search."
            : "Create your first purchase order to start tracking stock coming in.",
        }}
        toolbar={
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search order, supplier, status…"
            className="sm:w-80"
          />
        }
      />

      <PoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliers}
        medicines={medicines}
        onSaved={() => {
          refresh();
          setFormOpen(false);
        }}
      />

      {/* Detail dialog (doubles as the receive entry point) */}
      <Dialog
        open={Boolean(detailFor)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailFor(null);
            setReceiveFor(null);
            setPaymentFor(null);
          }
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detail?.po_number ?? detailFor?.po_number}</DialogTitle>
            <DialogDescription>
              {detail?.supplier_name ?? ""} · {detail?.status && <StatusBadge status={detail.status} />}
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
              {/* Items */}
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl shadow-card ring-1 ring-border">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.medicine_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} ordered · {item.received_quantity} received
                        {item.quantity - item.received_quantity > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}
                            · {item.quantity - item.received_quantity} pending
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.line_total)}</p>
                      <p className="text-xs text-muted-foreground">@{formatCurrency(item.cost_price)}</p>
                    </div>
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
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span className="tabular-nums">{formatCurrency(detail.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due</span>
                  <span
                    className={
                      detail.due > 0
                        ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400"
                        : "font-semibold tabular-nums"
                    }
                  >
                    {formatCurrency(detail.due)}
                  </span>
                </div>
              </div>

              {/* Payments */}
              {detail.payments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Payments</p>
                  {detail.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 ring-border"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ReceiptText className="size-3.5" />
                        {formatDate(p.paid_at)} · {p.method}
                      </span>
                      <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                {detail.due > 0 && detail.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      setPaymentFor({ id: detail.id, po_number: detail.po_number, due: detail.due })
                    }
                  >
                    <Banknote className="size-4" /> Record payment
                  </Button>
                )}
                {(detail.status === "ordered" || detail.status === "partial") && (
                  <Button className="flex-1" onClick={() => setReceiveFor(detail)}>
                    <PackageCheck className="size-4" /> Receive stock
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {receiveTarget && (
        <ReceiveDialog
          po={receiveTarget}
          open={Boolean(receiveFor)}
          onOpenChange={(open) => {
            if (!open) {
              setReceiveFor(null);
              setDetailFor(null);
            }
          }}
          onReceived={() => {
            refresh();
            setReceiveFor(null);
            setDetailFor(null);
          }}
        />
      )}

      {paymentFor && (
        <PaymentDialog
          key={paymentFor.id}
          poNumber={paymentFor.po_number}
          poId={paymentFor.id}
          due={paymentFor.due}
          open={Boolean(paymentFor)}
          onOpenChange={(open) => !open && setPaymentFor(null)}
          onRecorded={() => {
            refresh();
            setPaymentFor(null);
          }}
        />
      )}
    </div>
  );
}
