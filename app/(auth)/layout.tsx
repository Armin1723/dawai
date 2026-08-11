import type { Metadata } from "next";
import { Cross } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient clinical washes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-5%,oklch(0.5_0.1_195/0.12),transparent_60%),radial-gradient(45%_40%_at_85%_90%,oklch(0.5_0.1_195/0.07),transparent_60%),radial-gradient(40%_35%_at_10%_85%,oklch(0.62_0.15_165/0.06),transparent_60%)] dark:bg-[radial-gradient(60%_50%_at_50%_-5%,oklch(0.74_0.1_190/0.13),transparent_60%),radial-gradient(45%_40%_at_85%_90%,oklch(0.74_0.1_190/0.08),transparent_60%),radial-gradient(40%_35%_at_10%_85%,oklch(0.74_0.13_165/0.06),transparent_60%)]"
      />
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)] ring-1 ring-primary/20">
          <Cross className="size-6" strokeWidth={2.5} />
          <span
            className="absolute -right-1 -top-1 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
            aria-hidden
          />
        </div>
        <div className="leading-tight">
          <p className="text-xl font-semibold tracking-tight">MediFlow AI</p>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Pharmacy OS
          </p>
        </div>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground/70">
        GST-ready · Batch &amp; FEFO inventory · AI-assisted operations
      </p>
    </div>
  );
}
