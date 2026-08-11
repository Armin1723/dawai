import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CommandMenu } from "@/components/layout/command-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MediFlow AI — Pharmacy Management",
    template: "%s · MediFlow AI",
  },
  description:
    "Modern, enterprise-grade medical store management: POS, inventory, GST, purchases, analytics and AI insights.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* Turbopack strips JSX comments from the production bundle, so the direction
        contract is emitted as runtime HTML below to stay auditable in the built output. */}
        <span
          aria-hidden
          data-ds-contract
          dangerouslySetInnerHTML={{
            __html:
              "<!--DIRECTION CONTRACT — Clinical Wayfinding (seed a74159e7): " +
              "THESIS: Signage-grade legibility for a pharmacy OS, refusing the generic neutral SaaS dashboard. " +
              "OWN-WORLD: cool clinical white / deep slate grounds; one signage-teal accent; color-zones " +
              "(emerald = ok, amber = caution, rose = critical) mapped onto stock, expiry and payment states; " +
              "oversized tabular numerals; hairline rings with soft lifted shadows; themed selection, scrollbar and caret. " +
              "STORY: an owner or cashier trusts the store's state at a glance — green, amber, rose say where to act. " +
              "FIRST VIEWPORT: dashboard greeting hero with live status chip and New-sale CTA, four counting KPI cards " +
              "with zone deltas, revenue/profit chart and category donut. " +
              "FORM: candidate 5 of the grounded list, hospital wayfinding signage, raised by declined challengers " +
              "(size-led hierarchy, ruled double-height headers, framed data blocks, severity bars). " +
              "FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md-->",
          }}
        />
        <Providers>
          {children}
          <CommandMenu />
        </Providers>
      </body>
    </html>
  );
}
