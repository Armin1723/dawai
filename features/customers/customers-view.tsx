"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  Power,
  ReceiptText,
  ShoppingCart,
  UserRound,
  Users,
  Wallet,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { CustomerForm } from "@/features/customers/customer-form";
import { CustomerPaymentDialog } from "@/features/customers/customer-payment-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CustomerDetail, CustomerRow } from "@/repositories/customers.repository";
import type { CustomerInput } from "@/schemas/customer";

interface CustomersViewProps {
  initialCustomers: CustomerRow[];
  focusCustomerId?: string;
}

export function CustomersView({ initialCustomers, focusCustomerId }: CustomersViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<CustomerInput> & { id: string }) | null>(null);
  // Deep-link support: /customers?customer=<id> opens that profile on load.
  const [detailFor, setDetailFor] = useState<CustomerRow | null>(() =>
    focusCustomerId ? initialCustomers.find((c) => c.id === focusCustomerId) ?? null : null
  );
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<CustomerRow | null>(null);

  const { data: customers = initialCustomers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      const json = (await res.json()) as { data?: CustomerRow[] };
      return json.data ?? [];
    },
    initialData: initialCustomers,
  });

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ["customer-detail", detailFor?.id],
    enabled: Boolean(detailFor),
    queryFn: async () => {
      const res = await fetch(`/api/customers/${detailFor?.id}`);
      if (!res.ok) throw new Error("Failed to load customer");
      const json = (await res.json()) as { data?: CustomerDetail };
      return json.data;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["customers"] });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not deactivate customer");
    },
    onSuccess: () => {
      toast.success("Customer deactivated");
      setDeactivating(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Deactivate failed"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.phone ?? ""} ${c.email ?? ""} ${c.city ?? ""} ${c.blood_group ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [customers, search]);

  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="size-3.5" />
            </span>
            <span className="truncate">{row.original.name}</span>
          </p>
          <p className="pl-9 text-xs text-muted-foreground">
            {row.original.phone ?? "No phone"}
            {!row.original.is_active && " · inactive"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.city ?? "—"}</span>
      ),
    },
    {
      accessorKey: "total_spent",
      header: "Purchases",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="font-medium tabular-nums">{formatCurrency(row.original.total_spent)}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.sale_count === 0 ? "no sales" : `${row.original.sale_count} sale${row.original.sale_count === 1 ? "" : "s"}`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "outstanding_balance",
      header: "Outstanding",
      cell: ({ row }) => {
        const outstanding = row.original.outstanding_balance;
        const limit = row.original.credit_limit;
        const over = limit > 0 && outstanding > limit;
        return (
          <span
            className={
              over
                ? "font-semibold tabular-nums text-rose-600 dark:text-rose-400"
                : outstanding > 0
                  ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400"
                  : "font-semibold tabular-nums"
            }
          >
            {formatCurrency(outstanding)}
          </span>
        );
      },
    },
    {
      accessorKey: "credit_limit",
      header: "Credit limit",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.credit_limit > 0 ? formatCurrency(row.original.credit_limit) : "Unlimited"}
        </span>
      ),
    },
    {
      accessorKey: "loyalty_points",
      header: "Loyalty",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          {row.original.loyalty_points} pts
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
              <Eye className="size-4" /> View profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setEditing({
                  id: row.original.id,
                  name: row.original.name,
                  phone: row.original.phone ?? "",
                  email: row.original.email ?? "",
                  address: row.original.address ?? "",
                  city: row.original.city ?? "",
                  state: row.original.state ?? "",
                  pincode: row.original.pincode ?? "",
                  date_of_birth: row.original.date_of_birth ?? "",
                  blood_group: row.original.blood_group ?? "",
                  credit_limit: row.original.credit_limit,
                  notes: row.original.notes ?? "",
                  is_active: row.original.is_active,
                })
              }
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            {row.original.outstanding_balance > 0 && (
              <DropdownMenuItem onClick={() => setDetailFor(row.original)}>
                <Wallet className="size-4" /> Record payment
              </DropdownMenuItem>
            )}
            {row.original.is_active && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeactivating(row.original)}
              >
                <Power className="size-4" /> Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const totalOutstanding = customers.reduce((s, x) => s + x.outstanding_balance, 0);
  const duesCount = customers.filter((c) => c.outstanding_balance > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} customers · ${duesCount} with dues · ${formatCurrency(totalOutstanding)} outstanding`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Users className="size-4" /> Add customer
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: Users,
          title: "No customers found",
          description: search
            ? "Try adjusting your search."
            : "Add your first customer to track credit and history.",
        }}
        toolbar={
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search name, phone, email, city…"
            className="sm:w-80"
          />
        }
      />

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          refresh();
          setFormOpen(false);
          toast.success(editing ? "Customer updated" : "Customer added");
        }}
      />

      {/* Detail dialog */}
      <Dialog open={Boolean(detailFor)} onOpenChange={(open) => !open && setDetailFor(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              {detail?.name ?? detailFor?.name}
            </DialogTitle>
            <DialogDescription>
              {detail?.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {detail.phone}</span>}
              {detail?.city && <> · {detail.city}</>}
              {detail?.email && <> · {detail.email}</>}
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
              {/* Balance strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p
                    className={`mt-0.5 text-lg font-bold tabular-nums ${
                      detail.outstanding_balance > 0 ? "text-amber-600 dark:text-amber-400" : ""
                    }`}
                  >
                    {formatCurrency(detail.outstanding_balance)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
                  <p className="text-xs text-muted-foreground">Credit limit</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">
                    {detail.credit_limit > 0 ? formatCurrency(detail.credit_limit) : "∞"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
                  <p className="text-xs text-muted-foreground">Loyalty</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">{detail.loyalty_points} pts</p>
                </div>
              </div>

              {/* Purchase history */}
              <div>
                <p className="mb-1.5 text-sm font-medium">Purchase history</p>
                {detail.sales.length === 0 ? (
                  <p className="rounded-xl p-4 text-center text-sm text-muted-foreground ring-1 ring-dashed ring-border">
                    No purchases yet — checkouts in POS with this customer will appear here.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl shadow-card ring-1 ring-border">
                    {detail.sales.map((s) => (
                      <li key={s.sale_id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <ReceiptText className="size-3.5 text-muted-foreground" />
                            {s.invoice_number ?? s.sale_number}
                          </p>
                          <p className="pl-[18px] text-xs text-muted-foreground">
                            {formatDate(s.sold_at)} · paid {formatCurrency(s.paid)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={s.payment_status} />
                          <span className="text-sm font-semibold tabular-nums">{formatCurrency(s.total)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Payments */}
              {detail.payments.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium">Payments</p>
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl shadow-card ring-1 ring-border">
                    {detail.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Wallet className="size-3.5" />
                          {formatDate(p.paid_at)}
                          {p.reference && <span className="text-xs">· {p.reference}</span>}
                        </span>
                        <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button asChild variant="outline">
                  <Link href={`/pos?customer=${detail.id}`}>
                    <ShoppingCart className="size-4" /> New sale
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing({
                    id: detail.id,
                    name: detail.name,
                    phone: detail.phone ?? "",
                    email: detail.email ?? "",
                    address: detail.address ?? "",
                    city: detail.city ?? "",
                    state: detail.state ?? "",
                    pincode: detail.pincode ?? "",
                    date_of_birth: detail.date_of_birth ?? "",
                    blood_group: detail.blood_group ?? "",
                    credit_limit: detail.credit_limit,
                    notes: detail.notes ?? "",
                    is_active: detail.is_active,
                  })}
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  disabled={detail.outstanding_balance <= 0}
                  onClick={() => setPayDialogOpen(true)}
                >
                  <Wallet className="size-4" /> Record payment
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CustomerPaymentDialog
        customer={detail ?? detailFor}
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        onRecorded={() => {
          setPayDialogOpen(false);
          refetchDetail();
          refresh();
          toast.success("Payment recorded — customer dues updated");
        }}
      />

      <AlertDialog open={Boolean(deactivating)} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer stays in history but is hidden from new checkouts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deactivating && deactivateMutation.mutate(deactivating.id)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
