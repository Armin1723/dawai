"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Pill,
  Power,
  Layers,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MedicineForm } from "@/features/inventory/medicine-form";
import { BatchDialog } from "@/features/inventory/batch-dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type {
  MedicineListItem,
  CategoryOption,
  ManufacturerOption,
} from "@/repositories/inventory.repository";
import type { MedicineInput } from "@/schemas/medicine";

type StockFilter = "all" | "in stock" | "low" | "out of stock";
type ExpiryFilter = "all" | "near expiry" | "expired";

interface InventoryViewProps {
  initialMedicines: MedicineListItem[];
  categories: CategoryOption[];
  manufacturers: ManufacturerOption[];
}

export function InventoryView({ initialMedicines, categories, manufacturers }: InventoryViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<MedicineInput> & { id: string }) | null>(null);
  const [batchFor, setBatchFor] = useState<{ id: string; name: string } | null>(null);
  const [batchesFor, setBatchesFor] = useState<{ id: string; name: string } | null>(null);
  const [deactivating, setDeactivating] = useState<MedicineListItem | null>(null);

  const { data: medicines = initialMedicines, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/medicines");
      if (!res.ok) throw new Error("Failed to load inventory");
      const json = (await res.json()) as { data?: MedicineListItem[] };
      return json.data ?? [];
    },
    initialData: initialMedicines,
  });

  const { data: batches } = useQuery({
    queryKey: ["batches", batchesFor?.id],
    enabled: Boolean(batchesFor),
    queryFn: async () => {
      const res = await fetch(`/api/inventory/medicines/${batchesFor?.id}/batches`);
      if (!res.ok) throw new Error("Failed to load batches");
      const json = (await res.json()) as {
        data?: {
          id: string;
          batch_number: string;
          expiry_date: string;
          quantity: number;
          purchase_price: number;
          selling_price: number;
          mrp: number;
          received_date: string | null;
        }[];
      };
      return json.data ?? [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["medicines"] });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/medicines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not deactivate medicine");
    },
    onSuccess: () => {
      toast.success("Medicine deactivated");
      setDeactivating(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Deactivate failed"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (q && !`${m.name} ${m.generic_name ?? ""} ${m.sku} ${m.barcode ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      if (stockFilter !== "all" && m.stock_status !== stockFilter) return false;
      if (expiryFilter === "near expiry" && m.expiry_status !== "near expiry") return false;
      if (expiryFilter === "expired" && m.expiry_status !== "expired") return false;
      return true;
    });
  }, [medicines, search, stockFilter, expiryFilter]);

  const columns: ColumnDef<MedicineListItem>[] = [
    {
      accessorKey: "name",
      header: "Medicine",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                !row.original.is_active && "opacity-50"
              )}
            >
              <Pill className="size-3.5" />
            </span>
            <span className="truncate">{row.original.name}</span>
            {row.original.generic_name && (
              <span className="hidden truncate text-xs font-normal text-muted-foreground md:inline">
                {row.original.generic_name}
              </span>
            )}
          </p>
          <p className="pl-9 text-xs text-muted-foreground">
            {row.original.sku}
            {row.original.barcode ? ` · ${row.original.barcode}` : ""}
            {!row.original.is_active && " · inactive"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "current_stock",
      header: "Stock",
      cell: ({ row }) => (
        <div>
          <p
            className={cn(
              "font-semibold tabular-nums",
              row.original.stock_status === "out of stock" && "text-rose-600 dark:text-rose-400",
              row.original.stock_status === "low" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {row.original.current_stock}
          </p>
          <p className="text-xs text-muted-foreground">min {row.original.min_stock}</p>
        </div>
      ),
    },
    {
      id: "stock_status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.stock_status} />,
    },
    {
      accessorKey: "earliest_expiry",
      header: "Expiry",
      cell: ({ row }) => (
        <div>
          <p className="text-sm tabular-nums">{formatDate(row.original.earliest_expiry)}</p>
          {row.original.expiry_status !== "ok" && (
            <StatusBadge status={row.original.expiry_status} className="mt-1" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "mrp",
      header: "MRP",
      cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.mrp)}</span>,
    },
    {
      accessorKey: "selling_price",
      header: "Selling",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.original.selling_price)}</span>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.location ?? "—"}
        </Badge>
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
            <DropdownMenuItem
              onClick={() => {
                setBatchesFor({ id: row.original.medicine_id, name: row.original.name });
              }}
            >
              <Layers className="size-4" /> View batches
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setBatchFor({ id: row.original.medicine_id, name: row.original.name })}
            >
              <PackagePlus className="size-4" /> Add stock
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setEditing({
                  id: row.original.medicine_id,
                  name: row.original.name,
                  generic_name: row.original.generic_name,
                  sku: row.original.sku,
                  barcode: row.original.barcode,
                  category_id: null,
                  manufacturer_id: null,
                  gst_rate: row.original.gst_rate,
                  mrp: row.original.mrp,
                  purchase_price: row.original.purchase_price,
                  selling_price: row.original.selling_price,
                  min_stock: row.original.min_stock,
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
        title="Inventory"
        description={`${medicines.length} medicines · ${formatCurrency(
          medicines.reduce((sum, m) => sum + m.stock_value, 0)
        )} total stock value`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PackagePlus className="size-4" /> Add medicine
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: Boxes,
          title: "No medicines found",
          description: search || stockFilter !== "all" || expiryFilter !== "all"
            ? "Try adjusting your search or filters."
            : "Add your first medicine to start tracking stock.",
        }}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onSearch={setSearch}
              placeholder="Search name, SKU, barcode…"
              className="sm:w-80"
            />
            <div className="flex items-center gap-2">
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock</SelectItem>
                  <SelectItem value="in stock">In stock</SelectItem>
                  <SelectItem value="low">Low stock</SelectItem>
                  <SelectItem value="out of stock">Out of stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v as ExpiryFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All expiry</SelectItem>
                  <SelectItem value="near expiry">Near expiry</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <MedicineForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        categories={categories}
        manufacturers={manufacturers}
        onSaved={refresh}
      />

      {batchFor && (
        <BatchDialog
          open={Boolean(batchFor)}
          onOpenChange={(open) => !open && setBatchFor(null)}
          medicineId={batchFor.id}
          medicineName={batchFor.name}
          onSaved={refresh}
        />
      )}

      <Dialog open={Boolean(batchesFor)} onOpenChange={(open) => !open && setBatchesFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Batches — {batchesFor?.name}</DialogTitle>
            <DialogDescription>Earliest expiry first (FEFO order).</DialogDescription>
          </DialogHeader>
          {!batches ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No batches yet. Use “Add stock” to receive inventory.
            </p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto rounded-xl shadow-card ring-1 ring-border">
              {batches.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.batch_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(b.expiry_date)} · received {b.received_date ? formatDate(b.received_date) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{b.quantity} units</p>
                    <p className="text-xs text-muted-foreground">
                      Cost {formatCurrency(b.purchase_price)} · Sell {formatCurrency(b.selling_price)}
                    </p>
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
              The medicine stays in history but is hidden from POS and new purchases. Stock is untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deactivating && deactivateMutation.mutate(deactivating.medicine_id)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
