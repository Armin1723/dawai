"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  Power,
  ReceiptText,
  Truck,
  UserRound,
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
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SupplierRow } from "@/repositories/suppliers.repository";
import type { SupplierInput } from "@/schemas/supplier";

interface SuppliersViewProps {
  initialSuppliers: SupplierRow[];
}

export function SuppliersView({ initialSuppliers }: SuppliersViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<SupplierInput> & { id: string }) | null>(null);
  const [detailFor, setDetailFor] = useState<SupplierRow | null>(null);
  const [deactivating, setDeactivating] = useState<SupplierRow | null>(null);

  const { data: suppliers = initialSuppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to load suppliers");
      const json = (await res.json()) as { data?: SupplierRow[] };
      return json.data ?? [];
    },
    initialData: initialSuppliers,
  });

  const { data: transactions } = useQuery({
    queryKey: ["supplier-transactions", detailFor?.id],
    enabled: Boolean(detailFor),
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${detailFor?.id}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      const json = (await res.json()) as {
        data?: { po_id: string; po_number: string; order_date: string; status: string; total: number; paid: number }[];
      };
      return json.data ?? [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["suppliers"] });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not deactivate supplier");
    },
    onSuccess: () => {
      toast.success("Supplier deactivated");
      setDeactivating(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Deactivate failed"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      `${s.name} ${s.gstin ?? ""} ${s.contact_person ?? ""} ${s.city ?? ""} ${s.phone ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [suppliers, search]);

  const columns: ColumnDef<SupplierRow>[] = [
    {
      accessorKey: "name",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-3.5" />
            </span>
            <span className="truncate">{row.original.name}</span>
          </p>
          <p className="pl-9 text-xs text-muted-foreground">
            {row.original.gstin ? `GSTIN ${row.original.gstin}` : "No GSTIN"}
            {!row.original.is_active && " · inactive"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "contact_person",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.contact_person ? (
            <p className="flex items-center gap-1.5">
              <UserRound className="size-3.5 text-muted-foreground" />
              {row.original.contact_person}
            </p>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
          {row.original.phone && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" />
              {row.original.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "total_purchases",
      header: "Purchases",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCurrency(row.original.total_purchases)}</span>
      ),
    },
    {
      accessorKey: "total_paid",
      header: "Paid",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{formatCurrency(row.original.total_paid)}</span>
      ),
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: ({ row }) => (
        <span
          className={
            row.original.outstanding > 0
              ? "font-semibold tabular-nums text-amber-600 dark:text-amber-400"
              : "font-semibold tabular-nums"
          }
        >
          {formatCurrency(row.original.outstanding)}
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
              <Eye className="size-4" /> View transactions
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setEditing({
                  id: row.original.id,
                  name: row.original.name,
                  gstin: row.original.gstin ?? "",
                  contact_person: row.original.contact_person ?? "",
                  phone: row.original.phone ?? "",
                  email: row.original.email ?? "",
                  city: row.original.city ?? "",
                  state: row.original.state ?? "",
                  opening_balance: row.original.opening_balance,
                  notes: row.original.notes ?? "",
                  is_active: row.original.is_active,
                })
              }
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} suppliers · ${formatCurrency(
          suppliers.reduce((s, x) => s + x.outstanding, 0)
        )} total outstanding`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Truck className="size-4" /> Add supplier
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: Building2,
          title: "No suppliers found",
          description: search
            ? "Try adjusting your search."
            : "Add your first supplier to create purchase orders.",
        }}
        toolbar={
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search name, GSTIN, contact…"
            className="sm:w-80"
          />
        }
      />

      <SupplierForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          refresh();
          setFormOpen(false);
          toast.success(editing ? "Supplier updated" : "Supplier added");
        }}
      />

      <Dialog open={Boolean(detailFor)} onOpenChange={(open) => !open && setDetailFor(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detailFor?.name}</DialogTitle>
            <DialogDescription>
              {detailFor?.gstin && <>GSTIN {detailFor.gstin} · </>}
              {detailFor?.city && <>{detailFor.city}</>}
              {detailFor?.phone && <> · {detailFor.phone}</>}
            </DialogDescription>
          </DialogHeader>
          {!transactions ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="data-skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No purchase orders yet for this supplier.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-xl shadow-card ring-1 ring-border">
              {transactions.map((t) => (
                <li key={t.po_id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <ReceiptText className="size-3.5 text-muted-foreground" />
                      {t.po_number}
                    </p>
                    <p className="pl-[18px] text-xs text-muted-foreground">
                      {formatDate(t.order_date)} · paid {formatCurrency(t.paid)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(t.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deactivating)} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The supplier stays in history but is hidden from new purchase orders.
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
