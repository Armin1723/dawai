"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { cn } from "@/lib/utils";

export type MetricTone = "teal" | "emerald" | "amber" | "rose" | "sky";

export const TONE_CHIP: Record<MetricTone, string> = {
  teal: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function toneChipClass(tone: MetricTone): string {
  return TONE_CHIP[tone];
}

interface MetricCardProps {
  title: string;
  value: string;
  /** When set, the value counts up to this number (formatted with `valueFormat`). */
  countTo?: number;
  valueFormat?: (value: number) => string;
  delta?: number; // percent change vs previous period
  icon?: ComponentType<{ className?: string }>;
  tone?: MetricTone;
  hint?: string;
  loading?: boolean;
  className?: string;
  /** Optional drill-down target; wraps the card in a link. */
  href?: string;
}

export function MetricCard({
  title,
  value,
  countTo,
  valueFormat,
  delta,
  icon: Icon,
  tone = "teal",
  hint,
  loading,
  className,
  href,
}: MetricCardProps) {
  const trend =
    delta === undefined || delta === null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const trendClasses =
    trend === "up"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : trend === "down"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-muted text-muted-foreground";
  const trendIcon =
    trend === "up" ? <ArrowUpRight className="size-3.5" /> : trend === "down" ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />;

  const card = (
    <Card
      className={cn(
        "h-full transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lifted",
        href && "group/card focus-within:ring-2 focus-within:ring-primary/40",
        className
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {Icon && (
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONE_CHIP[tone])}>
                <Icon className="size-4.5" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {loading ? (
              <div className="data-skeleton h-9 w-28 rounded-md" />
            ) : (
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {countTo !== undefined ? (
                  <AnimatedNumber
                    value={countTo}
                    format={valueFormat ?? ((n) => n.toLocaleString("en-IN"))}
                  />
                ) : (
                  value
                )}
              </span>
            )}
            {!loading && delta !== undefined && delta !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  trendClasses
                )}
              >
                {trendIcon}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
          {hint && <p className="mt-auto text-xs text-muted-foreground">{hint}</p>}
        </CardContent>
      </Card>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {href ? (
        <Link
          href={href}
          className="block outline-none"
          aria-label={`${title} — view details`}
          onClick={(e) => e.stopPropagation()}
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </motion.div>
  );
}
