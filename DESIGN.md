---
name: MediFlow AI
description: Signage-grade legibility for a pharmacy OS — Clinical Wayfinding.
colors:
  primary: "oklch(50% 0.105 195)"
  neutral-bg: "oklch(98.4% 0.003 240)"
  neutral-ink: "oklch(17% 0.02 250)"
  surface: "oklch(100% 0 0)"
  surface-muted: "oklch(95.5% 0.005 235)"
  muted-ink: "oklch(46% 0.015 250)"
  zone-ok: "oklch(62% 0.15 165)"
  zone-caution: "oklch(75% 0.16 75)"
  zone-critical: "oklch(55% 0.2 25)"
  zone-info: "oklch(65% 0.13 225)"
  ink-dark: "oklch(17.5% 0.013 250)"
  surface-dark: "oklch(21.2% 0.015 250)"
  primary-dark: "oklch(74% 0.105 190)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
    textTransform: "uppercase"
  data:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    fontFeature: "tabular-nums"
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "19px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "oklch(45% 0.105 195)"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  nav-item-active:
    backgroundColor: "oklch(93% 0.025 195)"
    textColor: "oklch(32% 0.075 195)"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: MediFlow AI

## Overview

**Creative North Star: "The Hospital Wayfinding System"**

MediFlow AI looks like the signage of a well-run hospital: every surface is a legible zone, every number is oversized and unambiguous, and the state of the store is readable from across the counter in color alone. It refuses the generic neutral SaaS dashboard — the familiar gray cards of indistinguishable importance — in favor of a clinical white / deep slate ground where one signage-teal accent marks the primary action and a green / amber / rose zone language carries meaning: stock, expiry, and payment states are colors before they are words.

The system is Operate-first: density and speed at the counter, calm trust at the desk. Expression never obscures the task. Layouts vary between a wide chart, a donut, ranked lists, and divided rows rather than repeating identical icon-heading-text cards. Light and dark are both first-class, picked from the use scene: bright fluorescent counters in daylight, evening shifts at the desk.

**Key Characteristics:**
- Oversized tabular numerals for anything countable (KPI figures, totals, stock).
- One accent (signage teal) used for primary actions, current selection, and focus — never decoration.
- Color zones (emerald / amber / rose / sky) as a semantic language shared by badges, deltas, and chart fills.
- Hairline rings on surfaces with soft lifted shadows on hover; elevation declared once per element.
- Browser surfaces are themed: selection, scrollbar, caret, and focus rings carry the palette.
- Motion is 150–250 ms state feedback; the single authored moment is the KPI count-up.

## Colors

A cool clinical palette: white with a faint blue cast in light mode, deep slate in dark mode, one teal accent, and four semantic zones.

### Primary
- **Signage Teal** (light `oklch(50% 0.105 195)` / dark `oklch(74% 0.105 190)`): primary buttons, brand mark, sidebar active state, focus rings, chart series 1. Contrast-verified for white text on light and dark text on dark.

### Neutral
- **Clinical White** (`oklch(98.4% 0.003 240)`): page background in light mode.
- **Ink Blue-Black** (`oklch(17% 0.02 250)`): foreground text; the ink has a cool undertone, never pure gray.
- **Card White** (`oklch(100% 0 0)`): cards, popovers, tables.
- **Surface Muted** (`oklch(95.5% 0.005 235)`): secondary surfaces, table header rows, hover fills.
- **Muted Ink** (`oklch(46% 0.015 250)`): secondary text; keeps ≥ 4.5:1 on white.
- **Night Slate** (dark `oklch(17.5% 0.013 250)`): page background in dark mode.
- **Night Card** (dark `oklch(21.2% 0.015 250)`): cards in dark mode.

### Zones (semantic, both themes)
- **Zone Ok — Emerald** (`oklch(62% 0.15 165)`): in stock, active, paid, received, completed.
- **Zone Caution — Amber** (`oklch(75% 0.16 75)`): low stock, near expiry, pending, overdue-billing attention.
- **Zone Critical — Rose** (`oklch(55% 0.2 25)`): out of stock, expired, overdue, destructive actions; the critical dot pulses.
- **Zone Info — Sky** (`oklch(65% 0.13 225)`): partial, ordered, held, UPI.

Zones render as tinted chips: `bg-emerald-500/10 text-emerald-700` (dark: `text-emerald-400`) with a `ring-1` of the hue and a leading 6px dot.

### Named Rules
**The Zone Rule.** Green, amber, rose, and sky are a shared vocabulary — a stock badge, a KPI delta, and a chart slice that say the same thing use the same hue. Never invent a fifth status color.

**The One Accent Rule.** Signage teal is used on ≤ 10% of any screen: primary actions, the active nav pill, selection, and focus. Its rarity is the point.

## Typography

**Display Font:** Geist (with system sans fallback)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono — code, receipt values, and technical keys only

**Character:** One well-tuned sans carries the whole system — headings, labels, body, and data. Headings pull tracking to −0.03em and rely on weight and size, never decoration. Numerals in data are always tabular so columns read as columns.

### Hierarchy
- **Display** (600, 30px / line 1.2, −0.03em): page titles (`PageHeader`) and the dashboard greeting. Max 4xl (36px).
- **Title** (600, 16px, −0.01em): card titles, list item names, invoice numbers.
- **Body** (400, 14px, line 1.6): descriptions, list metadata, table cells. Prose caps at 65–75ch; tables may run dense.
- **Label** (600, 11px, +0.08em, uppercase): sidebar section labels, table column headers.
- **Data** (600, 14px, tabular): KPI numerals (30px), totals, stock counts, prices.

### Named Rules
**The Size Rule.** Hierarchy is carried by size and weight alone. No kicker, eyebrow, or small-caps label above a heading; no gradient or colored emphasis text.

## Layout

A max-width 1400px content column centered in the dashboard shell, with `p-4 / p-6 / p-8` padding scaling by breakpoint. Vertical rhythm is `space-y-6` (24px) between sections, `gap-4` (16px) within grids.

- KPI rows: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- Chart/alerts rows: `grid gap-4 lg:grid-cols-3` with a `lg:col-span-2` featured panel.
- The shell is a fixed 256px sidebar (cool neutral `--sidebar`), a 56px glass header, and the content column. Mobile collapses the sidebar into a sheet.
- Sidebar section labels and the table header row use the 11px uppercase Label style.
- Density is structural: responsive grid columns and a collapsible sidebar, never fluid type.

## Elevation & Depth

A hybrid of hairline rings and soft, offset shadows. Elevation is declared **once** per element — a ring at rest or a shadow at rest, never both.

### Shadow Vocabulary
- **Card** (`0 1px 2px oklch(20% 0.03 250 / 5%), 0 8px 24px -12px oklch(20% 0.03 250 / 18%)`): table containers and POS panels at rest.
- **Lifted** (`0 2px 4px …, 0 16px 40px -16px …`): hover elevation for cards, POS product tiles, auth cards.
- **Popover** (`0 4px 12px …, 0 24px 48px -12px …`): dropdowns, dialogs, command palette.

### Named Rules
**The One-Elevation Rule.** A surface declares one elevation language: hairline rings for grid-connected surfaces (cards in a grid, table containers) and `shadow-card` for free-floating panels (auth cards, POS cart). Hover lifts interactive tiles with `shadow-lifted` over their hairline ring. A wide soft shadow under a 1px border on connected content — the ghost card — does not exist here.

## Shapes

The form language is "softly squared": cards at 14px radius, controls at 12px, small chips and dots fully rounded, and a signature square brand mark (12–14px radius) carrying the cross.

- Cards, tables, dialogs: 14px (`rounded-xl` = `--radius` 0.875rem).
- Buttons, inputs, badges, nav items: 12px.
- Dots, status dots, kbd chips, pills: fully rounded.
- Icon tiles inside cards and table rows: 8–12px radius with a zone tint.

## Components

### Buttons
- **Shape:** rounded 12px; default height 32px, `sm` 28px, `lg` 36px; icons inline, 16px.
- **Primary:** signage teal surface, white text, a 1px low shadow; hover deepens the teal and lifts the shadow; active translates down 1px. Used for the single main action per screen (New sale, Checkout, Add medicine).
- **Outline:** card surface, ink text, 1px input-tone border; hover fills muted.
- **Ghost / Destructive:** ghost for toolbars; destructive renders rose-tinted (`bg-destructive/10 text-destructive`), not a solid red button.

### Chips (StatusBadge + zone chips)
- **Style:** tinted zone surface (`bg-{zone}-500/10`), zone-tinted text, 1px ring of the zone hue, leading 6px dot, 11–12px text, fully rounded.
- **State:** the critical dot pulses (`animate-live-dot`). Method chips in recent sales use the same grammar.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card white (dark: night card), hairline ring `ring-1 ring-foreground/[0.07]`.
- **Shadow Strategy:** ring at rest; `shadow-lifted` + 2px lift on hover for interactive cards (KPI, POS product tiles). Table containers and POS cart use `shadow-card` at rest.
- **Internal Padding:** 20px (`p-5`), card headers compact with 12px below the header row.

### Inputs / Fields
- **Style:** 32px height, 12px radius, 1px input-tone border, transparent background (dark: 30% white fill).
- **Focus:** 3px teal ring at 50% opacity (`ring-ring/50`) + teal border. Error: rose border + rose ring.
- **Disabled:** 50% opacity, no pointer. The caret is always teal.

### Navigation (sidebar)
- **Style:** 11px uppercase section labels; items 32px tall, 14px medium, 16px icons.
- **Active:** a teal-tinted accent pill (`bg-accent` + `ring-1 ring-primary/10`) with a 4px teal indicator bar on the outer edge and a teal icon — the wayfinding "you are here" marker. The pill animates between items with a spring `layoutId`.
- **Badges:** "POS" is a solid teal pill; "NEW" is emerald-tinted.

### Signature: KPI MetricCard
- Oversized tabular numeral (30px, 600) with a one-time count-up (650ms exponential ease-out) — the system's single authored motion moment.
- A 36px zone-tinted icon tile in the corner; a delta pill (emerald/rose tinted with arrow) beside the numeral; a muted hint line at the base.
- Hover: 2px lift + lifted shadow.

## Do's and Don'ts

### Do:
- **Do** use the four zones for anything status-like, and reuse the exact hue for the badge, delta, and chart of the same state.
- **Do** render every countable figure in tabular numerals at the largest sensible size.
- **Do** declare elevation once per element — ring at rest, lifted shadow on hover.
- **Do** keep motion at 150–250ms for state feedback; reserve the count-up for KPI figures.
- **Do** theme the browser's surfaces (selection, scrollbar, caret) from the palette — it is the cheapest signal of a built system.

### Don't:
- **Don't** add a kicker/eyebrow above a heading, gradient text, or colored emphasis type — weight and size carry hierarchy.
- **Don't** use glass or blur as decoration; it is reserved for the sticky header's scroll-under effect.
- **Don't** scatter decorative sparklines, progress rings, or identical icon-heading-text card rows as page structure.
- **Don't** invent a fifth status color or reach for brand hues outside the zone set for status.
- **Don't** replace standard affordances (modals, selects, scrollbars) with custom flavor.
