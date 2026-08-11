import { Badge } from "@/components/ui/badge";
import { statusVariant } from "@/constants/statuses";
import { cn } from "@/lib/utils";

type Zone = "success" | "warning" | "destructive" | "info" | "neutral";

const ZONE_STYLE: Record<Zone, { dot: string; badge: string; pulse?: boolean }> = {
  success: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  warning: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400",
  },
  destructive: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400",
    pulse: true,
  },
  info: {
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400",
  },
  neutral: {
    dot: "bg-muted-foreground/60",
    badge: "bg-muted text-muted-foreground ring-1 ring-border",
  },
};

function zoneForVariant(variant: ReturnType<typeof statusVariant>): Zone {
  switch (variant) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "destructive":
      return "destructive";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusVariant(status);
  const zone = zoneForVariant(variant);
  const style = ZONE_STYLE[zone];

  return (
    <Badge
      className={cn("h-5.5 gap-1.5 px-2 py-0.5 capitalize", style.badge, className)}
      variant="ghost"
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", style.dot, style.pulse && "animate-live-dot")}
        aria-hidden
      />
      {status.replace(/[-_]/g, " ")}
    </Badge>
  );
}
