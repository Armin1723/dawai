"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Cross } from "lucide-react";
import { NAV_SECTIONS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export function SidebarLogo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 px-1 py-0.5">
      <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_2px_10px_-2px_var(--primary)] transition-transform duration-200 group-hover:scale-105">
        <Cross className="size-4" strokeWidth={2.5} />
        <span
          className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
          aria-hidden
        />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">MediFlow AI</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Pharmacy OS
        </p>
      </div>
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150",
                      active
                        ? "text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <>
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-lg bg-accent shadow-sm ring-1 ring-primary/10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                        />
                        <motion.span
                          layoutId="sidebar-active-bar"
                          className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                        />
                      </>
                    )}
                    <Icon
                      className={cn(
                        "relative z-10 size-4 shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="relative z-10">{item.title}</span>
                    {item.badge === "pos" && (
                      <span className="relative z-10 ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        POS
                      </span>
                    )}
                    {item.badge === "new" && (
                      <span className="relative z-10 ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        NEW
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SidebarFooter() {
  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden>
            <span className="absolute inset-0 animate-live-dot rounded-full bg-emerald-500" />
          </span>
          <p className="truncate text-[11px] font-medium text-muted-foreground">Store online</p>
        </div>
        <p className="text-[11px] tabular-nums text-muted-foreground/70">v0.1.0</p>
      </div>
    </div>
  );
}
