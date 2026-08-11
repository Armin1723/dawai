"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
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
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentMethodChip } from "@/components/shared/payment-method-chip";
import { ExpenseFormDialog } from "@/features/expenses/expense-form-dialog";
import { downloadCsv, formatCurrency, formatDate, localDayKey } from "@/lib/utils";
import type { ExpenseRow } from "@/repositories/expenses.repository";

interface ExpensesViewProps {
  initialExpenses: ExpenseRow[];
}

/** Stable tint per category, from the Clinical Wayfinding zone palette. */
const CATEGORY_TINTS: Record<string, string> = {
  Rent: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Electricity: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Salary: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Staff Wages": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Maintenance: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Marketing: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Software: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  Misc: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};
const FALLBACK_TINTS = [
  "bg-primary/10 text-primary",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
];
const tintFor = (category: string) => {
  if (CATEGORY_TINTS[category]) return CATEGORY_TINTS[category];
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_TINTS[h % FALLBACK_TINTS.length];
};

export function ExpensesView({ initialExpenses }: ExpensesViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: expenses = initialExpenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load expenses");
      const json = (await res.json()) as { data?: ExpenseRow[] };
      return json.data ?? [];
    },
    initialData: initialExpenses,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the expense");
    },
    onSuccess: () => {
      toast.success("Expense deleted");
      setDeleting(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  // -- derived stats (local day key so "due today" can't shift around midnight)
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayKey = localDayKey(now.toISOString());

  const stats = useMemo(() => {
    const month = expenses.filter((e) => e.expense_date.slice(0, 7) === monthKey);
    const monthTotal = month.reduce((s, e) => s + e.amount, 0);
    const due = expenses.filter(
      (e) => e.is_recurring && e.next_due_date && e.next_due_date <= todayKey
    );
    return {
      monthTotal,
      monthCount: month.length,
      dueCount: due.length,
      dueTotal: due.reduce((s, e) => s + e.amount, 0),
      total: expenses.reduce((s, e) => s + e.amount, 0),
      categories: new Set(expenses.map((e) => e.category)).size,
    };
  }, [expenses, monthKey, todayKey]);

  // Category chips with per-category totals (sorted by spend).
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (category && e.category !== category) return false;
      if (!q) return true;
      return `${e.category} ${e.description ?? ""} ${e.payment_method}`
        .toLowerCase()
        .includes(q);
    });
  }, [expenses, search, category]);

  async function generateDue() {
    setGenerating(true);
    try {
      const res = await fetch("/api/expenses/generate", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        data?: { generated: number };
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Could not generate expenses");
      toast.success(
        json.data.generated > 0
          ? `${json.data.generated} recurring expense${json.data.generated === 1 ? "" : "s"} posted`
          : "Nothing due yet"
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `mediflow-expenses-${monthKey}.csv`,
      ["Date", "Category", "Description", "Payment method", "Amount (INR)"],
      filtered.map((e) => [e.expense_date, e.category, e.description ?? "", e.payment_method, e.amount])
    );
  }

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      accessorKey: "expense_date",
      header: "Date",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-3.5" />
            </span>
            <span className="tabular-nums">{formatDate(row.original.expense_date)}</span>
          </p>
          {row.original.paid_by_name && (
            <p className="pl-9 text-xs text-muted-foreground">by {row.original.paid_by_name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tintFor(row.original.category)}`}>
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.description || "—"}</p>
          {row.original.is_recurring && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarClock className="size-3" />
              {row.original.frequency === "monthly"
                ? "Monthly template"
                : row.original.frequency === "quarterly"
                  ? "Quarterly template"
                  : "Yearly template"}
              {row.original.next_due_date && <> · due {formatDate(row.original.next_due_date)}</>}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <PaymentMethodChip method={row.original.payment_method} />,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">{formatCurrency(row.original.amount)}</span>
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
                setEditing(row.original);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={`${expenses.length} entries · ${formatCurrency(stats.total)} total · ${stats.categories} categories`}
        actions={
          <>
            {stats.dueCount > 0 && (
              <Button variant="outline" onClick={generateDue} disabled={generating}>
                {generating ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                Post {stats.dueCount} due
              </Button>
            )}
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Add expense
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(stats.monthTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{stats.monthCount} entries</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">Recurring due</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${stats.dueCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {stats.dueCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stats.dueCount > 0 ? `${formatCurrency(stats.dueTotal)} to post` : "nothing due"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{stats.categories}</p>
          <p className="text-[11px] text-muted-foreground">in use</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground">All time</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(stats.total)}</p>
          <p className="text-[11px] text-muted-foreground">across {expenses.length} entries</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={{
          icon: Receipt,
          title: "No expenses found",
          description:
            search || category
              ? "Try adjusting your search or category filter."
              : "Record rent, electricity and salaries — they flow into the Reports net-profit panel.",
        }}
        toolbar={
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onSearch={setSearch}
                placeholder="Search category, description, method…"
                className="sm:w-72"
              />
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
            {categoryTotals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    category === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  All · {formatCurrency(stats.total)}
                </button>
                {categoryTotals.map(([name, total]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCategory(category === name ? null : name)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      category === name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {name} · {formatCurrency(total)}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          refresh();
          toast.success(editing ? "Expense updated" : "Expense recorded");
        }}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.is_recurring
                ? `The "${deleting.category}" recurring template will stop — future instances won't be generated.`
                : `The ${formatCurrency(deleting?.amount ?? 0)} ${deleting?.category ?? ""} entry will be removed from history.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
