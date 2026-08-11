# MediFlow AI — UI Guidelines

> **Source of truth: `DESIGN.md` (root) + tokens in `app/globals.css`. Read them before building UI.**

## Design Language

**"Clinical Wayfinding"** — signage-grade legibility. Reference quality bar: Stripe Dashboard, Linear, Vercel.
The interface reads like hospital wayfinding: legible zones, oversized numerals, and a green/amber/rose color
language that communicates stock, expiry and payment state at a glance.

- Generous whitespace; 4px spacing scale; vertical rhythm `space-y-6`, grids `gap-4`.
- Premium typography: Geist (sans) + Geist Mono (code/receipts only); headings tracking −0.03em, hierarchy by
  size/weight only — **no kickers above headings, no gradient text**.
- Color zones: **emerald = ok** (in stock, paid), **amber = caution** (low stock, near expiry), **rose = critical**
  (out of stock, expired, destructive), **sky = info**. One signage-teal accent for primary actions, selection, focus.
- Elevation once per element: hairline ring at rest, `shadow-lifted` on hover. No border-under-shadow "ghost cards".
- Full dark + light via `next-themes`; both modes are first-class (counter in daylight, desk at night).
- Browser surfaces are themed (selection, scrollbar, caret, focus rings) — keep them.
- Keyboard shortcuts everywhere: `Cmd+K` command palette, `Escape` to dismiss, `Tab`-through forms.

## Required States — Every Page

Loading skeletons (shimmer) · empty states (icon + title + hint + CTA) · error states (retry) · search ·
pagination · filters · bulk actions where applicable · export · responsive · accessible · confirmation dialogs.

## Core Components

Built in `components/shared/` (wrappers over `components/ui/`):

- **DataTable** — @tanstack/react-table wrapper: sorting, pagination, tinted header row, empty state, toolbar slot.
- **MetricCard / KPI Card** — oversized tabular numeral with count-up, zone icon chip, delta pill, hint.
- **PageHeader** — display title (30px), description, chevron breadcrumbs, actions.
- **EmptyState** — raised icon tile, dashed container.
- **SearchInput** — debounced search box.
- **StatusBadge** — zone dot + tinted chip (critical dot pulses).
- **AnimatedNumber** — the one authored motion moment (KPI count-up, 650ms ease-out).
- **ConfirmDialog** — destructive-confirmation wrapper.
- **Field** — label + hint + error wrapper for manual forms (slots: `label`, `hint`, `error`).
- **PaymentMethodChip** — zone-tinted method chip (cash=emerald, UPI=sky, card=indigo, credit/violet, bank transfer/slate).

## Forms & Inputs

- **Inputs** are 36px tall (`h-9`), 12px radius, 40% muted fill, hairline border. Hover darkens the border to
  `foreground/25`; focus is the 3px teal ring (`ring-ring/50`) + teal border; error is rose border + rose ring.
- **Selects / Checkboxes** share the same fill + focus language. SelectContent floats on `shadow-popover`.
- **Labels** are 13px medium ink; hints are 12px muted; errors are 12px rose with an icon (never uppercase).
- Manual forms use the `Field` wrapper for label/hint/error; react-hook-form forms use the shadcn `Form`
  primitives (`FormField`, `FormMessage` — now with an alert icon).
- Grids inside dialogs: `grid-cols-2 gap-4`; full-width fields span both columns; dialog footers hold actions.
- Constrained inline inputs (POS discount, cash tendered) may override height with an explicit `h-8`.

## Accessibility

- Semantic landmarks; aria-labels on icon-only controls; teal focus rings (≥3px at 50%).
- Contrast-safe palette in both themes (body text ≥ 4.5:1, large text ≥ 3:1).
- Touch targets ≥ 40px — critical for the tablet POS mode. Respect `prefers-reduced-motion`.

## POS Mode (tablet)

- Full-height cart layout, large hit targets, barcode input auto-focus, on-screen numeric pad.
- Product tiles: `shadow-card` + ring at rest, `shadow-lifted` + teal ring on hover; stock zone badge on each tile.
- Print/thermal-friendly invoice view (`.print-area`).

## Status Colors

| Zone      | Meaning                                  | Usage                                                       |
| --------- | ---------------------------------------- | ----------------------------------------------------------- |
| Emerald   | In stock / Active / Paid / Received      | `StatusBadge`, deltas up, chart 2                           |
| Amber     | Low stock / Near expiry / Pending        | `StatusBadge`, deltas down (caution), chart 3               |
| Rose      | Out of stock / Expired / Overdue         | `StatusBadge` (pulsing dot), deltas down, destructive       |
| Sky       | Partial / Ordered / Held / UPI           | `StatusBadge`, method chips                                 |

## Component Checklist for New Features

1. Skeleton + empty + error states (shimmer, not spinners in content)
2. Search / filters / pagination / export
3. Confirmation for destructive actions
4. Responsive (mobile → tablet → desktop)
5. Keyboard navigable; `Cmd+K` reachable actions
6. Zone vocabulary for any status; tabular numerals for any figure
7. Subtle entrance motion only; keep the count-up exclusive to KPIs
