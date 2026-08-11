import { cn } from "@/lib/utils";

const METHOD_ZONE: Record<string, string> = {
  UPI: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400",
  Cash: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
  Card: "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400",
  Credit: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
  "Bank transfer": "bg-primary/10 text-primary ring-1 ring-primary/20",
};

export function PaymentMethodChip({ method, className }: { method: string; className?: string }) {
  const key = method === "bank_transfer" ? "Bank transfer" : method;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        METHOD_ZONE[key] ?? "bg-muted text-muted-foreground ring-1 ring-border",
        className
      )}
    >
      {key}
    </span>
  );
}
