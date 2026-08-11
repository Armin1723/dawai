"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
  Calculator,
  Check,
  CreditCard,
  History,
  Landmark,
  Loader2,
  Minus,
  PackageSearch,
  Pause,
  Percent,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Settings2,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserRound,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { statusVariant } from "@/constants/statuses";
import { ReceiptDialog } from "@/features/pos/receipt-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";
import type { PosProduct, PosCategory, RecentSale } from "@/repositories/pos.repository";
import type { CustomerOption } from "@/repositories/customers.repository";
import type { InvoiceContext } from "@/repositories/store.repository";
import type { CreateSaleResult } from "@/app/api/pos/sales/route";

type PaymentMethod = "cash" | "upi" | "card" | "credit";
const SPLIT_METHODS: Exclude<PaymentMethod, "credit">[] = ["cash", "upi", "card"];

interface CartItem {
  medicine_id: string;
  name: string;
  sku: string;
  unit_price: number;
  gst_rate: number;
  qty: number;
  stock: number;
  discount: number; // per-line discount (₹), persisted to sale_items.discount
}

interface HeldSale {
  id: string;
  label: string;
  savedAt: string;
  items: CartItem[];
  discount: number; // resolved ₹ amount
  payment_method: PaymentMethod;
  customer_id?: string | null;
  notes?: string;
}

interface ReceiptState {
  sale: CreateSaleResult;
  lines: { name: string; sku: string; qty: number; unit_price: number; discount: number; gst_rate: number; line_total: number }[];
  paymentMethod: PaymentMethod;
  amountReceived: number;
  discount: number;
  subtotal: number;
  tax: number;
  customerName: string | null;
  customerPhone: string | null;
  payments?: { method: string; amount: number }[];
  notes?: string | null;
}

interface PosSettings {
  sound: boolean;
  showOutOfStock: boolean;
  defaultPaymentMethod: PaymentMethod;
}

const HELD_KEY = "mediflow:held-sales";
const SETTINGS_KEY = "mediflow:pos-settings";

const DEFAULT_SETTINGS: PosSettings = {
  sound: true,
  showOutOfStock: true,
  defaultPaymentMethod: "cash",
};

function loadHeld(): HeldSale[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HELD_KEY) ?? "[]") as HeldSale[];
  } catch {
    return [];
  }
}

function loadSettings(): PosSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<PosSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "credit", label: "Credit", icon: UserRound },
];

const QUICK_CASH = [100, 200, 500, 1000, 2000];

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── WebAudio blips (no assets needed) ───────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  try {
    audioCtx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}
function tone(ctx: AudioContext, freq: number, start: number, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}
function playBeep(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudio();
  if (!ctx) return;
  try {
    tone(ctx, 880, ctx.currentTime, 0.09, 0.05);
  } catch {
    /* ignore audio errors */
  }
}
function playChime(enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudio();
  if (!ctx) return;
  try {
    tone(ctx, 659.25, ctx.currentTime, 0.12, 0.06);
    tone(ctx, 987.77, ctx.currentTime + 0.1, 0.18, 0.06);
  } catch {
    /* ignore audio errors */
  }
}

interface PosViewProps {
  initialProducts: PosProduct[];
  initialCustomers?: CustomerOption[];
  initialCategories?: PosCategory[];
  invoiceContext?: InvoiceContext | null;
  preselectCustomerId?: string;
}

export function PosView({
  initialProducts,
  initialCustomers = [],
  initialCategories = [],
  invoiceContext = null,
  preselectCustomerId,
}: PosViewProps) {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<PosSettings>(loadSettings);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    loadSettings().defaultPaymentMethod
  );
  const [cashReceived, setCashReceived] = useState(0);
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<Exclude<PaymentMethod, "credit">, string>>({
    cash: "",
    upi: "",
    card: "",
  });
  const [lineEditorId, setLineEditorId] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldSale[]>(() => loadHeld());
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [customer, setCustomer] = useState<CustomerOption | null>(() =>
    preselectCustomerId
      ? initialCustomers.find((c) => c.id === preselectCustomerId) ?? null
      : null
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  // Persist settings.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const { data: products = initialProducts, isLoading, isFetching } = useQuery({
    queryKey: ["pos-products", debounced, activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      if (activeCategory) params.set("category", activeCategory);
      const res = await fetch(`/api/pos/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const json = (await res.json()) as { data?: PosProduct[] };
      return json.data ?? [];
    },
    initialData: initialProducts,
  });

  // With initialData the grid never shows `isLoading`; show the skeleton while
  // a filtered (category / search) fetch is in flight so we don't flash the
  // unfiltered catalog.
  const gridLoading =
    isLoading || (isFetching && (activeCategory !== null || debounced.trim() !== ""));

  const { data: recentSales = [], isLoading: recentLoading } = useQuery({
    queryKey: ["pos-recent"],
    queryFn: async () => {
      const res = await fetch("/api/pos/sales");
      if (!res.ok) throw new Error("Failed to load recent sales");
      const json = (await res.json()) as { data?: RecentSale[] };
      return json.data ?? [];
    },
    enabled: recentOpen,
  });

  // Totals — mirror of the server's create_sale math (per-line discounts included).
  const { subtotal, tax, discountAmount, total } = useMemo(() => {
    let sub = 0;
    let tx = 0;
    for (const item of cart) {
      const net = item.unit_price * item.qty - item.discount;
      const gst = round2((net * item.gst_rate) / (100 + item.gst_rate));
      tx += gst;
      sub += net - gst;
    }
    sub = round2(sub);
    tx = round2(tx);
    const preDiscount = round2(sub + tx);
    const disc =
      discountMode === "percent" ? round2((preDiscount * discount) / 100) : round2(discount);
    const applied = Math.min(Math.max(disc, 0), preDiscount);
    return { subtotal: sub, tax: tx, discountAmount: applied, total: round2(preDiscount - applied) };
  }, [cart, discount, discountMode]);

  const change = cashReceived - total;

  const visibleProducts = useMemo(() => {
    if (settings.showOutOfStock) return products;
    return products.filter((p) => p.stock_status !== "out of stock");
  }, [products, settings.showOutOfStock]);

  function addToCart(product: PosProduct, qty = 1) {
    if (product.stock_status === "out of stock" || product.current_stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.medicine_id === product.medicine_id);
      if (existing) {
        return prev.map((i) =>
          i.medicine_id === product.medicine_id
            ? { ...i, qty: Math.min(i.qty + qty, i.stock) }
            : i
        );
      }
      return [
        ...prev,
        {
          medicine_id: product.medicine_id,
          name: product.name,
          sku: product.sku,
          unit_price: product.selling_price,
          gst_rate: product.gst_rate,
          qty,
          stock: product.current_stock,
          discount: 0,
        },
      ];
    });
    playBeep(settings.sound);
  }

  function updateItem(medicineId: string, patch: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.medicine_id !== medicineId) return i;
        const next = { ...i, ...patch };
        next.qty = Math.min(Math.max(next.qty, 1), next.stock);
        next.discount = Math.min(Math.max(next.discount, 0), next.unit_price * next.qty);
        next.unit_price = Math.max(next.unit_price, 0);
        return next;
      })
    );
  }

  function updateQty(medicineId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.medicine_id === medicineId
            ? { ...i, qty: Math.min(Math.max(qty, 1), i.stock) }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(medicineId: string) {
    setCart((prev) => prev.filter((i) => i.medicine_id !== medicineId));
    if (lineEditorId === medicineId) setLineEditorId(null);
  }

  function handleSearchEnter() {
    if (!query.trim()) return;
    const exactBarcode = products.find((p) => p.barcode && p.barcode === query.trim());
    if (exactBarcode) {
      addToCart(exactBarcode);
    } else if (products.length > 0) {
      addToCart(products[0]!);
    } else {
      toast.error("No medicine matches the scan");
    }
    setQuery("");
    searchRef.current?.focus();
  }

  function holdCart() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const heldSale: HeldSale = {
      id: crypto.randomUUID(),
      label: `Hold · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      savedAt: new Date().toISOString(),
      items: cart,
      discount: discountAmount,
      payment_method: paymentMethod,
      customer_id: customer?.id ?? null,
      notes: notes.trim() || undefined,
    };
    const next = [heldSale, ...held];
    setHeld(next);
    localStorage.setItem(HELD_KEY, JSON.stringify(next));
    setCart([]);
    setDiscount(0);
    setCashReceived(0);
    setNotes("");
    setShowNotes(false);
    toast.success("Sale held — you can resume it anytime");
  }

  function resumeSale(heldSale: HeldSale) {
    setCart(heldSale.items);
    setDiscount(heldSale.discount);
    setDiscountMode("amount");
    setPaymentMethod(heldSale.payment_method);
    setCustomer(heldSale.customer_id ? initialCustomers.find((c) => c.id === heldSale.customer_id) ?? null : null);
    setNotes(heldSale.notes ?? "");
    setShowNotes(Boolean(heldSale.notes));
    setHeld((prev) => prev.filter((h) => h.id !== heldSale.id));
    const next = held.filter((h) => h.id !== heldSale.id);
    localStorage.setItem(HELD_KEY, JSON.stringify(next));
    toast.success(`Resumed ${heldSale.label}`);
    searchRef.current?.focus();
  }

  function deleteHold(id: string) {
    const next = held.filter((h) => h.id !== id);
    setHeld(next);
    localStorage.setItem(HELD_KEY, JSON.stringify(next));
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
    setCashReceived(0);
    setNotes("");
    setShowNotes(false);
    setLineEditorId(null);
    setSplitMode(false);
    setSplitAmounts({ cash: "", upi: "", card: "" });
    setNumpadOpen(false);
  }

  function repeatSale(sale: RecentSale) {
    let added = 0;
    let skipped = 0;
    const fresh = [...cart];
    // Prefer the live search results (may include more than the initial 60).
    const known = [...products, ...initialProducts];
    for (const item of sale.items) {
      const product = known.find((p) => p.medicine_id === item.medicine_id);
      if (!product) {
        skipped++;
        continue;
      }
      if (product.stock_status === "out of stock" || product.current_stock <= 0) {
        toast.error(`${product.name} is out of stock — skipped`);
        skipped++;
        continue;
      }
      const existing = fresh.find((i) => i.medicine_id === item.medicine_id);
      if (existing) {
        existing.qty = Math.min(existing.qty + item.quantity, product.current_stock);
      } else {
        fresh.push({
          medicine_id: product.medicine_id,
          name: product.name,
          sku: product.sku,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate,
          qty: Math.min(item.quantity, product.current_stock),
          stock: product.current_stock,
          discount: 0,
        });
      }
      added++;
    }
    setCart(fresh);
    if (added > 0) {
      playBeep(settings.sound);
      toast.success(`Repeated ${added} item${added > 1 ? "s" : ""} from ${sale.sale_number}`);
    } else if (skipped > 0) {
      toast.error("Nothing could be repeated — stock unavailable or item not found");
    }
  }

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return initialCustomers;
    return initialCustomers.filter((c) => `${c.name} ${c.phone ?? ""}`.toLowerCase().includes(q));
  }, [initialCustomers, customerSearch]);

  const creditBlocked = paymentMethod === "credit" && !customer;
  const wouldBeBalance = customer ? customer.outstanding_balance + total : 0;
  const creditOverLimit =
    paymentMethod === "credit" && customer !== null && customer.credit_limit > 0 && wouldBeBalance > customer.credit_limit;

  // Split tender math.
  const splitTotal = SPLIT_METHODS.reduce((s, m) => s + (parseFloat(splitAmounts[m]) || 0), 0);
  const splitRemaining = round2(total - splitTotal);
  const splitComplete = Math.abs(splitRemaining) < 0.005;
  const splitOver = splitTotal > total + 0.005;

  function setSplitMethod(method: Exclude<PaymentMethod, "credit">, value: string) {
    setSplitAmounts((prev) => ({ ...prev, [method]: value }));
  }

  function fillSplitRemaining(method: Exclude<PaymentMethod, "credit">) {
    setSplitAmounts((prev) => ({ ...prev, [method]: String(Math.max(splitRemaining, 0)) }));
  }

  async function checkout() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!splitMode) {
      if (paymentMethod === "cash" && cashReceived < total) {
        toast.error("Cash received is less than the total");
        return;
      }
      if (paymentMethod === "credit" && !customer) {
        toast.error("Select a customer for credit sales");
        return;
      }
      if (creditOverLimit) {
        toast.error(
          `This sale would take ${customer?.name} over their credit limit of ${formatCurrency(customer?.credit_limit ?? 0)}`
        );
        return;
      }
    } else if (!splitComplete) {
      toast.error(splitOver ? "Payments exceed the total" : "Split payments don't cover the total");
      return;
    }

    const splitPayments = splitMode
      ? SPLIT_METHODS.filter((m) => (parseFloat(splitAmounts[m]) || 0) > 0).map((m) => ({
          method: m,
          amount: round2(parseFloat(splitAmounts[m]) || 0),
        }))
      : undefined;

    setSubmitting(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            medicine_id: i.medicine_id,
            quantity: i.qty,
            unit_price: i.unit_price,
            gst_rate: i.gst_rate,
            discount: i.discount,
          })),
          discount: discountAmount,
          payment_method: paymentMethod,
          amount_received: paymentMethod === "credit" ? 0 : cashReceived || total,
          customer_id: customer?.id ?? null,
          notes: notes.trim() || null,
          payments: splitPayments,
        }),
      });
      const json = (await res.json()) as { data?: CreateSaleResult; error?: { message: string } };
      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error?.message ?? "Checkout failed");
      }
      setReceipt({
        sale: json.data,
        lines: cart.map((i) => ({
          name: i.name,
          sku: i.sku,
          qty: i.qty,
          unit_price: i.unit_price,
          discount: i.discount,
          gst_rate: i.gst_rate,
          line_total: round2(i.unit_price * i.qty - i.discount),
        })),
        paymentMethod,
        amountReceived: splitMode ? splitTotal : paymentMethod === "credit" ? 0 : cashReceived || total,
        discount: discountAmount,
        subtotal,
        tax,
        customerName: customer?.name ?? null,
        customerPhone: customer?.phone ?? null,
        payments: splitPayments,
        notes: notes.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-recent"] });
      playChime(settings.sound);
      clearCart();
      setPaymentMethod(settings.defaultPaymentMethod);
      setSplitMode(false);
      setSplitAmounts({ cash: "", upi: "", card: "" });
      setNumpadOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleContainerKeyDown(e: React.KeyboardEvent) {
    if (receipt) return; // don't charge again while the receipt is open
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      void checkout();
    }
  }

  function appendNumpad(digit: string) {
    setCashReceived((prev) => {
      const next = prev === 0 && digit !== "." ? digit : `${prev}${digit}`;
      const parsed = parseFloat(next);
      return Number.isFinite(parsed) ? parsed : prev;
    });
  }

  const canCharge =
    !submitting &&
    cart.length > 0 &&
    (splitMode ? splitComplete : !creditBlocked && !creditOverLimit);

  return (
    <div
      className="grid h-[calc(100dvh-8.5rem)] gap-4 lg:grid-cols-[1fr_400px]"
      onKeyDown={handleContainerKeyDown}
    >
      {/* ── Left: search + categories + product grid ─────────────────── */}
      <div className="flex min-h-0 flex-col gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchEnter()}
            placeholder="Search or scan barcode… press Enter to add"
            className="h-12 pl-9 pr-4 text-base"
            aria-label="Search or scan products"
          />
        </div>

        {initialCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {initialCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeCategory === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {c.name}
                <span className="ml-1 opacity-60">{c.product_count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {gridLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description={
                query
                  ? `Nothing matches “${query}”. Try a name, SKU or barcode.`
                  : activeCategory
                    ? "No products in this category yet."
                    : "Add medicines in Inventory to start selling."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((p) => {
                const out = p.stock_status === "out of stock";
                return (
                  <button
                    key={p.medicine_id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(p)}
                    className={cn(
                      "group flex min-h-28 flex-col justify-between rounded-xl bg-card p-3 text-left shadow-card ring-1 ring-border transition-all",
                      "hover:-translate-y-0.5 hover:shadow-lifted hover:ring-primary/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      out && "opacity-45 hover:translate-y-0 hover:shadow-none hover:ring-border"
                    )}
                  >
                    <div>
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.category_name ?? p.sku}
                      </p>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-1">
                      <p className="text-base font-semibold tabular-nums">
                        {formatCurrency(p.selling_price)}
                      </p>
                      <Badge
                        variant={out ? "destructive" : p.stock_status === "low" ? "warning" : "success"}
                        className="text-[10px]"
                      >
                        {out ? "Out" : `${p.current_stock} left`}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: cart ─────────────────────────────────────────────── */}
      <aside className="flex min-h-0 flex-col rounded-xl bg-card shadow-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Cart</span>
            <Badge variant="secondary" className="ml-1">{cart.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setRecentOpen(true)}
            >
              <History className="size-3.5" /> Recent
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Pause className="size-3.5" /> Holds {held.length > 0 && `(${held.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Held sales</DropdownMenuLabel>
                {held.length === 0 ? (
                  <DropdownMenuItem disabled>No held sales</DropdownMenuItem>
                ) : (
                  held.map((h) => (
                    <DropdownMenuItem key={h.id} className="flex items-center justify-between gap-2" onSelect={(e) => e.preventDefault()}>
                      <button type="button" className="flex-1 text-left" onClick={() => resumeSale(h)}>
                        <p className="text-sm">{h.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.items.length} items · {formatCurrency(h.items.reduce((s, i) => s + i.unit_price * i.qty - i.discount, 0) - h.discount)}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHold(h.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Delete hold"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={holdCart}>
                  <Pause className="size-4" /> Hold current cart
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs" aria-label="POS settings">
                  <Settings2 className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>POS settings</DropdownMenuLabel>
                <div className="space-y-3 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="pos-sound" className="flex items-center gap-2 text-sm font-normal">
                      {settings.sound ? <Volume2 className="size-4 text-muted-foreground" /> : <VolumeX className="size-4 text-muted-foreground" />}
                      Scanner sounds
                    </Label>
                    <Switch
                      id="pos-sound"
                      checked={settings.sound}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, sound: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="pos-oos" className="text-sm font-normal">
                      Show out-of-stock products
                    </Label>
                    <Switch
                      id="pos-oos"
                      checked={settings.showOutOfStock}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, showOutOfStock: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="pos-default-pay" className="text-sm font-normal">
                      Default payment
                    </Label>
                    <select
                      id="pos-default-pay"
                      value={settings.defaultPaymentMethod}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, defaultPaymentMethod: e.target.value as PaymentMethod }))
                      }
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  <p><kbd className="rounded bg-muted px-1">Ctrl</kbd>+<kbd className="rounded bg-muted px-1">Enter</kbd> — charge</p>
                  <p><kbd className="rounded bg-muted px-1">Enter</kbd> in search — scan / add first match</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearCart}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Tap a product to add it.<br />Scan barcodes with the search box.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((item) => {
                const editing = lineEditorId === item.medicine_id;
                const lineTotal = round2(item.unit_price * item.qty - item.discount);
                return (
                  <li key={item.medicine_id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setLineEditorId(editing ? null : item.medicine_id)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <p className="truncate text-sm font-medium underline-offset-2 group-hover:underline">
                          {item.name}
                          {item.discount > 0 && (
                            <span className="ml-1.5 rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              -{formatCurrency(item.discount)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price)} · GST {item.gst_rate}%
                        </p>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="size-7" onClick={() => updateQty(item.medicine_id, item.qty - 1)} aria-label="Decrease quantity">
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                        <Button variant="outline" size="icon" className="size-7" onClick={() => updateQty(item.medicine_id, item.qty + 1)} aria-label="Increase quantity">
                          <Plus className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.medicine_id)} aria-label="Remove item">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(lineTotal)}
                    </p>
                    {editing && (
                      <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Price (₹)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unit_price || ""}
                            onChange={(e) =>
                              updateItem(item.medicine_id, { unit_price: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Line disc. (₹)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.discount || ""}
                            onChange={(e) =>
                              updateItem(item.medicine_id, { discount: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">GST %</Label>
                          <p className="flex h-8 items-center text-xs font-medium tabular-nums">
                            {item.gst_rate}%
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Totals + payment */}
        <div className="max-h-[46%] space-y-3 overflow-y-auto border-t px-4 py-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST</span>
              <span className="tabular-nums">{formatCurrency(tax)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Discount
                <button
                  type="button"
                  onClick={() => setDiscountMode(discountMode === "amount" ? "percent" : "amount")}
                  className="rounded border px-1 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                  aria-label="Toggle discount mode"
                >
                  {discountMode === "amount" ? "₹" : <Percent className="size-2.5" />}
                </button>
              </span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 w-28 text-right"
                placeholder={discountMode === "percent" ? "0%" : "₹0"}
                aria-label="Discount"
              />
            </div>
            <div className="flex justify-between pt-1 text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Customer picker */}
          <Popover open={customerPickerOpen} onOpenChange={(open) => {
            setCustomerPickerOpen(open);
            if (!open) setCustomerSearch("");
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  creditBlocked
                    ? "border-destructive/60 bg-destructive/5 text-destructive"
                    : creditOverLimit
                      ? "border-destructive/60 bg-destructive/5"
                      : customer
                        ? "border-primary/50 bg-primary/5"
                        : "text-muted-foreground hover:bg-muted"
                )}
                aria-label="Select customer"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {customer ? (
                    <>
                      <UserRound className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-medium text-foreground">{customer.name}</span>
                    </>
                  ) : (
                    <>
                      <Users className="size-4 shrink-0" />
                      <span>{creditBlocked ? "Credit sale — customer required" : "Walk-in customer"}</span>
                    </>
                  )}
                </span>
                {customer && (
                  <span className="shrink-0 text-xs">
                    {creditOverLimit ? (
                      <span className="font-medium text-destructive">over limit</span>
                    ) : customer.outstanding_balance > 0 ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        owes {formatCurrency(customer.outstanding_balance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">no dues</span>
                    )}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
              <div className="p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers…"
                    className="h-9 pl-8"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto border-t">
                {filteredCustomers.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No customers found
                  </p>
                ) : (
                  filteredCustomers.map((c) => {
                    const overLimit = c.credit_limit > 0 && c.outstanding_balance >= c.credit_limit;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomer(c);
                          setCustomerPickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.phone ?? "No phone"}
                            {c.outstanding_balance > 0 &&
                              ` · owes ${formatCurrency(c.outstanding_balance)}`}
                          </span>
                        </span>
                        {customer?.id === c.id && <Check className="size-4 shrink-0 text-primary" />}
                        {overLimit && (
                          <span className="shrink-0 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            at limit
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              {customer && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerPickerOpen(false);
                  }}
                  className="w-full border-t px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Clear customer → walk-in
                </button>
              )}
            </PopoverContent>
          </Popover>

          {creditBlocked && (
            <p className="text-center text-[11px] text-destructive">
              Credit sales must be attached to a customer to track dues.
            </p>
          )}
          {creditOverLimit && (
            <p className="text-center text-[11px] text-destructive">
              This sale exceeds {customer?.name}&apos;s credit limit of {formatCurrency(customer?.credit_limit ?? 0)}.
            </p>
          )}

          {/* Payment method grid + split toggle */}
          {!splitMode ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors",
                      paymentMethod === id
                        ? "border-primary/50 bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    aria-pressed={paymentMethod === id}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSplitMode(true);
                  setSplitAmounts({ cash: "", upi: "", card: "" });
                }}
                className="w-full rounded-md border border-dashed py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                Split payment (cash + UPI + card)
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg border p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold">Split payment</p>
                <button
                  type="button"
                  onClick={() => setSplitMode(false)}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Single method
                </button>
              </div>
              {SPLIT_METHODS.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium capitalize">{m}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={splitAmounts[m]}
                    onChange={(e) => setSplitMethod(m, e.target.value)}
                    placeholder="₹0"
                    className="h-8 flex-1 text-right"
                    aria-label={`${m} amount`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    onClick={() => fillSplitRemaining(m)}
                    disabled={splitRemaining <= 0}
                  >
                    Fill
                  </Button>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1.5 text-xs">
                <span className={cn("font-medium", splitOver ? "text-destructive" : "text-muted-foreground")}>
                  {splitOver ? `Over by ${formatCurrency(splitTotal - total)}` : splitComplete ? "Covered ✓" : `Remaining ${formatCurrency(splitRemaining)}`}
                </span>
                <span className="tabular-nums font-semibold">{formatCurrency(splitTotal)} / {formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {!splitMode && paymentMethod === "cash" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Cash received</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => setNumpadOpen((v) => !v)}
                    aria-label="Toggle numpad"
                  >
                    <Calculator className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={cashReceived || ""}
                    onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                    className="h-9 w-32 text-right"
                    placeholder={formatCurrency(total)}
                    aria-label="Cash received"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCashReceived(total)}
                  className="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                >
                  Exact
                </button>
                {QUICK_CASH.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashReceived(amt)}
                    className="rounded-md border px-2 py-1 text-[11px] font-medium tabular-nums transition-colors hover:bg-muted"
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
              {numpadOpen && (
                <div className="grid grid-cols-4 gap-1 rounded-lg border bg-muted/40 p-1.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => (k === "⌫" ? setCashReceived((p) => Math.floor(p / 10)) : appendNumpad(k))}
                      className="h-9 rounded-md bg-background text-sm font-semibold shadow-sm transition-colors hover:bg-primary/10 active:scale-95"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span className={cn("font-semibold tabular-nums", change < 0 ? "text-destructive" : "")}>
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {/* Sale note */}
          {showNotes ? (
            <div className="space-y-1.5">
              <Label htmlFor="pos-note" className="text-xs text-muted-foreground">Note on receipt</Label>
              <Textarea
                id="pos-note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bill to John's clinic, PO #42…"
                className="h-16 resize-none text-xs"
                maxLength={500}
              />
              <Button variant="ghost" size="sm" className="h-6 px-1 text-[11px] text-muted-foreground" onClick={() => setShowNotes(false)}>
                Remove note
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-[11px] text-muted-foreground"
              onClick={() => setShowNotes(true)}
            >
              <ReceiptText className="size-3.5" /> Add note
            </Button>
          )}

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={checkout}
            disabled={!canCharge}
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : <Landmark className="size-5" />}
            {submitting ? "Processing…" : splitMode ? `Collect ${formatCurrency(splitTotal)}` : `Charge ${formatCurrency(total)}`}
          </Button>
        </div>
      </aside>

      {/* ── Recent sales drawer ──────────────────────────────────────── */}
      <Sheet open={recentOpen} onOpenChange={setRecentOpen}>
        <SheetContent className="w-full sm:max-w-md" side="right">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="size-4" /> Recent sales
            </SheetTitle>
            <SheetDescription>Last 10 checkouts — tap Repeat to rebuild the cart.</SheetDescription>
          </SheetHeader>
          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            {recentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No sales yet"
                description="Completed checkouts will appear here."
              />
            ) : (
              recentSales.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{s.sale_number}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{s.payment_method}</Badge>
                      <Badge variant={statusVariant(s.payment_status)} className="text-[10px] capitalize">
                        {s.payment_status}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relativeTime(s.sold_at)} · {s.item_count ?? 0} items ·{" "}
                    <span className="font-semibold tabular-nums">{formatCurrency(s.total)}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 gap-1.5 text-[11px]"
                    onClick={() => repeatSale(s)}
                  >
                    <Repeat className="size-3" /> Repeat sale
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {receipt && (
        <ReceiptDialog
          sale={receipt.sale}
          lines={receipt.lines}
          paymentMethod={receipt.paymentMethod}
          amountReceived={receipt.amountReceived}
          discount={receipt.discount}
          subtotal={receipt.subtotal}
          tax={receipt.tax}
          customerName={receipt.customerName}
          customerPhone={receipt.customerPhone}
          payments={receipt.payments}
          notes={receipt.notes}
          invoiceContext={invoiceContext}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
