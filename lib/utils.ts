import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Default currency symbol — INR for the primary market (see settings table for per-store override). */
export const DEFAULT_CURRENCY = "₹";

export function formatCurrency(value: number | null | undefined, currency = DEFAULT_CURRENCY): string {
  if (value === null || value === undefined || Number.isNaN(value)) return `${currency}0`;
  return `${currency}${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function absoluteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}

const IN_WORDS_ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const IN_WORDS_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitsInWords(n: number): string {
  if (n < 20) return IN_WORDS_ONES[n]!;
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${IN_WORDS_TENS[ten]}${one ? ` ${IN_WORDS_ONES[one]}` : ""}`;
}

function threeDigitsInWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const h = hundred ? `${IN_WORDS_ONES[hundred]} Hundred` : "";
  const r = rest ? twoDigitsInWords(rest) : "";
  return [h, r].filter(Boolean).join(" ");
}

/** Convert an amount to words using the Indian numbering system (lakh/crore). */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  if (rupees === 0 && paise > 0) return `Zero Rupees and ${twoDigitsInWords(paise)} Paise Only`;

  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1000);
  const rest = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigitsInWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitsInWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitsInWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitsInWords(rest));

  let words = `${parts.join(" ")} Rupees`;
  if (paise > 0) words += ` and ${twoDigitsInWords(paise)} Paise`;
  return `${words} Only`;
}

/** Download tabular data as a CSV file (quotes fields, neutralises spreadsheet formula injection). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Start of a local day, offset by `offsetDays` from today (server clock). */
export function startOfLocalDay(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** "YYYY-MM-DD" key for an ISO timestamp in server-local time. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Aug 03" label for a YYYY-MM-DD key. */
export function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

/** "3m ago"-style relative time for an ISO timestamp. */
export function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
