# invIT — AssetFlow Design System

A premium, operational SaaS platform for IT inventory, procurement planning, and internal requests. The aesthetic must feel like Linear, Stripe, Ramp, Vercel, Notion and Raycast — refined, calm, dense without clutter.

## Brand

- **Name:** invIT (product brand: AssetFlow)
- **Voice:** operational, precise, modern, confident
- **Personality:** enterprise-grade, premium, restrained
- **Audience:** IT department managers and operators

## Visual principles

- Dark-first. The default theme is a deep, slightly cool black with a faint blue undertone. Light theme is supported but secondary.
- Layered surfaces with subtle elevation. Cards float over the background; the sidebar is one shade darker than the canvas for visual anchoring.
- High information density without noise. Use whitespace and typography hierarchy — never decorative shapes.
- Color is semantic and rare. Reserve color for status, primary CTAs, charts, and brand moments. Everything else is neutral.
- Microinteractions are subtle and fast (180–360 ms). Never bouncy or playful.

## Color palette

### Dark (primary)
- Background: `oklch(0.135 0.008 260)` — deep near-black with slight cool tone
- Sidebar: `oklch(0.12 0.008 260)` — darker than canvas (depth)
- Card: `oklch(0.17 0.009 260)`
- Popover: `oklch(0.185 0.009 260)`
- Border: `oklch(0.27 0.011 260)` — subtle
- Foreground: `oklch(0.97 0.005 260)`
- Muted foreground: `oklch(0.66 0.012 260)`

### Brand
- Primary: `oklch(0.7 0.18 265)` — refined indigo-cobalt
- Primary on light: `oklch(0.55 0.22 265)`

### Status (semantic)
- Healthy: emerald `oklch(0.74 0.16 155)` (dark) / `oklch(0.62 0.16 155)` (light)
- Low stock: amber `oklch(0.82 0.15 80)` (dark) / `oklch(0.73 0.16 80)` (light)
- Critical: red `oklch(0.72 0.21 25)` (dark) / `oklch(0.62 0.22 25)` (light)
- Out of stock: deep red `oklch(0.6 0.18 25)` (dark) / `oklch(0.5 0.18 25)` (light)
- Info: sky `oklch(0.76 0.14 220)` (dark) / `oklch(0.62 0.14 220)` (light)

Every status has a "soft" companion (12–18% alpha) used as background fill in badges and chips.

## Typography

- **Sans:** Inter — UI, body, headings. Tracking-tight for headings, default for body. Use OpenType features `ss01`, `cv11`, `calt`, `rlig`.
- **Mono:** JetBrains Mono — IDs, SKUs, numbers in tables, console moments.
- Scale: `text-xs` (11.5px) for metadata · `text-sm` (13.5px) for body and table cells · `text-base` (14.5px) sparingly · `text-lg`–`text-2xl` for section headings · `text-3xl`–`text-4xl` for hero KPIs.
- Headings: weight 600, tracking `-0.011em`. Body: weight 400. Numbers in KPIs: weight 600, mono optional for emphasis.

## Spacing & layout

- Base grid: 4 px. Default component padding `12px` / `16px` / `24px`.
- Page max-width: 1440px, fluid. Sidebar fixed at 256 px. Topbar 56 px tall.
- Card radius: 10 px. Inputs: 8 px. Pills/badges: 9999 px.
- Section gaps: 24 px between cards on a row, 32 px between rows.

## Components

### App shell
- **Sidebar (256 px):** logo block, primary nav (Dashboard, Inventory, Procurement, Requests, Analytics, Activity, Settings), workspace switcher at top, user profile at bottom. Items have a 28 px height, icon + label, hover background `--sidebar-accent`. Active state has a faint left accent bar in `--primary` and slightly stronger foreground.
- **Topbar (56 px):** breadcrumb on the left, command-palette trigger (⌘K) center-left, quick-actions on the right (theme toggle, notifications, profile menu).
- **Command palette (Raycast-style):** centered modal at 30% from top, 640 px wide, with sectioned results (Navigation · Inventory · Procurement · Actions). Faint border, blur background.

### Cards
- Background `--card` with 1 px border `--border`.
- Optional `card-elevated` style: top inner highlight + soft drop shadow for hero KPIs.
- Header row: title (text-sm muted) and trailing action.
- Body: dense content. Use grids of 2–4 columns for KPIs.

### KPI card (dashboard hero)
- Left: small icon in a `--primary-soft` square (32 px, radius 8).
- Middle: label (text-xs uppercase tracking-wide muted-foreground), value (text-3xl semibold), delta (small chip, green/red).
- Optional: tiny sparkline (recharts) at the bottom in `--chart-1`.

### Tables
- Header: text-xs uppercase tracking-wide muted-foreground, 36 px tall, bottom 1 px border.
- Rows: 44 px tall, divided by 1 px `--border`. Hover row background `--accent` at 40% mix.
- Cells: text-sm. Monospace for IDs/SKUs and numeric quantities.
- Checkbox column on the left for bulk actions.
- Status cells use a `Badge` with soft background.
- Pagination row at the bottom: 48 px tall, results count on left, paginator on right.

### Badges (status)
- Pill, 22 px tall, padding 8 px, text-xs medium.
- Background = status-soft color. Foreground = status color. No border.
- Healthy = emerald. Low = amber. Critical = red. Out = deep red. Info = sky.

### Activity feed
- Vertical list, 12 px gap.
- Each item: 28 px circular icon (status-colored), text on the right (actor + verb + entity, plus relative timestamp in muted-foreground).
- Subtle left rail connector at 14 px.

### Buttons
- Primary: `--primary` fill, white-ish foreground, hover lighten 8%.
- Secondary: `--secondary` fill, neutral.
- Outline: transparent fill with border `--border`, hover muted.
- Ghost: no border, hover background `--muted` at 40%.
- Sizes: xs (24), sm (28), default (32), lg (36).
- Buttons in tables/topbar tend to be sm/icon size.

### Inputs
- Height 36 px, radius 8, border `--border`. Focus ring 2 px in `--ring` at 30% alpha.
- Inline icon (lucide) at 16 px on the left for search.

## Iconography

- Library: `lucide-react`. Always 16 px in chrome, 20 px in cards, 24 px in hero spots.
- Stroke width 1.75.

## Motion

- Default transition: `transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out`.
- Entry: `animate-fade-in-up` (360 ms, slight rise, no bounce).
- Skeletons: shimmer left-to-right, 1600 ms.
- Live dots (active connections, etc.): pulse-soft, 2 s.

## Charts

- Use Recharts with the project palette (`--chart-1` … `--chart-5`).
- Area charts default to gradient fill of the chart color at 18 % top to 0 % bottom.
- Axis: 11 px muted-foreground, no axis line, 1 px dashed grid in `--border`.
- Tooltips: card background, 8 px padding, radius 8, 1 px border.

## Empty states

- Always include: a softly tinted icon, a one-line title (text-base), a muted description (text-sm), one primary CTA.
- Background: `--card` with `bg-grid` fading via mask.

## Skeletons

- `bg-muted` block with shimmer animation. Match the exact shape (KPI: same size as final card; table row: 44 px tall).

## Voice for copy in UI

- Crisp, factual, instrumental. "Order placed", "Stock below threshold", "12 items flagged for review".
- Avoid exclamation. Avoid first-person plural ("we"). Avoid promotional language.
