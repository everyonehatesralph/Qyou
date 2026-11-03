# Qyou Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand DeVerse Cafe to Qyou and rebuild every screen on a token-based "Daylight" design system with per-restaurant theming, a dark kitchen screen, and a product landing page.

**Architecture:** All colors become CSS custom properties in `src/styles/globals.css`, scoped by `data-theme="light|dark"` (any subtree can override). Restaurant identity and accent live in `src/config/restaurant.ts`; accent shades are computed in JS (`src/theme/`) and injected at startup. Pages are rebuilt on small shared components in `src/components/ui/`. Legacy token names stay aliased until the cleanup task so the app renders correctly between tasks.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind 3, lucide-react icons, Node 24 built-in test runner (`node --test`, no new dependencies).

**Spec:** `docs/superpowers/specs/2026-11-03-qyou-redesign-design.md` — token values, status colors, screen designs and rules are defined there and not repeated here.

**Plan format note:** foundation tasks (1–5) specify exact signatures, tests and commands. Screen tasks (6–13) specify files, structure, components and acceptance checks; their markup is written during execution against the shared components, so it is not duplicated here.

---

## File map

Create:
| File | Responsibility |
|---|---|
| `src/theme/color.ts` | Pure hex math: parse, mix, luminance, contrast. No imports. |
| `src/theme/color.test.ts` | `node --test` unit tests for `color.ts`. |
| `src/theme/accent.ts` | `accentTokens()` and `applyRestaurantTheme()`: computes and injects accent CSS vars for both modes. |
| `src/theme/status.ts` | `STATUS_META` and `StatusGroup`: one mapping of order status → label + color group. |
| `src/config/restaurant.ts` | `RESTAURANT`: name, short name, logo letter, accent per mode, currency, tables. |
| `src/config/product.ts` | `PRODUCT`: Qyou name, tagline, contact (phone/email/messenger), demo table path. |
| `src/components/ui/*.tsx` + `index.ts` | Button, Card, StatusPill, Chip, TextInput, TextArea, QuantityStepper, BottomSheet, PageHeader, EmptyState, Wordmark. |
| `src/pages/Landing.tsx` + `src/pages/landing/*.tsx` | Product landing page and its sections. |
| `scripts/check-contrast.mjs` | Parses token blocks in `globals.css` + config accent; fails on any pair below WCAG AA. |
| `scripts/check-colors.mjs` | Fails if any `src/**/*.tsx` contains a hex or `rgba(`/`rgb(` color literal (allowlist empty after Task 14). |

Modify: `src/styles/globals.css`, `tailwind.config.js`, `index.html`, `public/index.html`, `package.json`, `src/main.tsx`, `src/App.tsx`, `src/context/ThemeContext.tsx`, every file under `src/pages/` and `src/components/`, storage/channel names in `src/context/*.ts(x)` and `src/services/orderSync.ts`, `server/*.ts` log text, `README.md`, `WEBAPP_OVERVIEW.md`, `ARCHITECTURE_PERFORMANCE.md`.

Delete (Task 14): `src/pages/Welcome.tsx`.

Import rule: files in `src/theme/` and `src/config/` import each other with explicit `.ts`
extensions (`import { mixHex } from './color.ts'`) so the Node check scripts can load them
directly. `tsconfig.json` already allows this (`allowImportingTsExtensions`).

## Shared interfaces (names used across tasks)

```ts
// src/theme/color.ts
export type RGB = [number, number, number]
export function hexToRgb(hex: string): RGB            // accepts #rgb and #rrggbb
export function rgbToHex(rgb: RGB): string            // lowercase #rrggbb
export function mixHex(a: string, b: string, weightA: number): string  // weightA ∈ [0,1]
export function relativeLuminance(hex: string): number                 // WCAG 2.x
export function contrastRatio(a: string, b: string): number            // ≥ 1

// src/theme/accent.ts
export type Mode = 'light' | 'dark'
export function accentTokens(mode: Mode, accent: string, onAccent: string, surface: string): Record<string, string>
//   keys: --accent, --accent-hover, --on-accent, --accent-soft, --accent-text
//   light: hover = mix(accent, #000, .85), soft = mix(accent, surface, .12), text = mix(accent, #000, .80)
//   dark:  hover = mix(accent, #fff, .85), soft = mix(accent, surface, .18), text = mix(accent, #fff, .85)
export function applyRestaurantTheme(): void   // injects <style id="qyou-accent"> once

// src/theme/status.ts
export type StatusGroup = 'waiting' | 'progress' | 'ready' | 'done' | 'cancelled'
export const STATUS_META: Record<OrderStatus, { label: string; customerLabel: string; group: StatusGroup }>

// src/config/restaurant.ts
export interface TableDef { id: number; label: string }
export const RESTAURANT: { name: string; shortName: string; logoText: string;
  accent: { light: string; dark: string }; onAccent: { light: string; dark: string };
  currency: string; tables: TableDef[] }
export function tableLabel(id: number): string   // label or `Table ${id}`

// src/config/product.ts
export const PRODUCT: { name: 'Qyou'; tagline: string;
  contact: { phone: string; email: string; messenger: string }; demoTablePath: string }
```

Tailwind color names after Task 3 (legacy names kept as aliases until Task 14):
`bg`, `surface`, `surface-2`, `surface-3`, `line`, `line-strong`, `ink`, `ink-muted`, `ink-faint`,
`accent`, `accent-hover`, `accent-soft`, `accent-text`, `on-accent`,
`status-{waiting,progress,ready,done,cancelled}-{bg,text}`.
Legacy aliases: `background`→bg, `primary`→accent, `text-base`→ink, `text-muted`→ink-muted,
`text-faint`→ink-faint, `border`→line, `border-light`→line-strong, `success/warning/error/info` → status text colors.

---

## Phase 1 — Foundation (one commit)

### Task 1: Color math with tests

**Files:** Create `src/theme/color.ts`, `src/theme/color.test.ts`; Modify `package.json` (scripts).

- [ ] Step 1: Write `src/theme/color.test.ts` using `node:test` + `node:assert/strict`:
  - `hexToRgb('#fff')` → `[255,255,255]`; `hexToRgb('#9A5A0E')` → `[154,90,14]`
  - `rgbToHex([154,90,14])` → `'#9a5a0e'`
  - `mixHex('#000000','#ffffff',0.5)` → `'#808080'` (round half up per channel)
  - `mixHex('#9A5A0E','#ffffff',1)` → `'#9a5a0e'`
  - `contrastRatio('#000000','#ffffff')` ≈ 21 (±0.01); `contrastRatio('#1F1A17','#FAF7F2')` > 15
  - `contrastRatio(a,b) === contrastRatio(b,a)`
- [ ] Step 2: Add script `"test": "node --test src/theme/"` and run `npm test` → FAIL (module not found).
- [ ] Step 3: Implement `color.ts` per the interface (erasable TypeScript only, no enums, no imports).
- [ ] Step 4: `npm test` → all pass.

### Task 2: Restaurant and product config; dedupe tables

**Files:** Create `src/config/restaurant.ts`, `src/config/product.ts`. Modify table definitions in
`src/pages/customer/TokenValidation.tsx:6-25`, `src/pages/staff/Dashboard.tsx:13-23`,
`src/pages/staff/QRCodeGenerator.tsx:8-18`, `src/pages/staff/TableAvailability.tsx:8-18`
(Welcome.tsx is deleted later; leave it).

- [ ] Step 1: Create both config files with the values in spec §1.4 (`RESTAURANT.name = 'Qyou Demo Café'`, accent `#9A5A0E` / `#E0A04A`, onAccent `#FFFFFF` / `#1A1208`, tables 1–10; `PRODUCT.contact.phone = '09468901590'`, email and messenger `''`, `demoTablePath = '/t/1'`).
- [ ] Step 2: Replace each local `TABLES`/`TABLE_NAMES` with `RESTAURANT.tables` / `tableLabel(id)`. Keep the `name` field shape where consumers read `.name` by mapping `label` → `name` at the call site, or update consumers.
- [ ] Step 3: `npx tsc --noEmit` → exit 0.

### Task 3: Tokens, theme scoping, accent injection, fonts

**Files:** Modify `src/styles/globals.css` (token blocks at lines 10–115), `tailwind.config.js`,
`src/context/ThemeContext.tsx`, `src/main.tsx`, `index.html`; Create `src/theme/accent.ts`,
`src/theme/status.ts`, `scripts/check-contrast.mjs`.

- [ ] Step 1: Write `scripts/check-contrast.mjs`: read `globals.css`, extract custom properties from the `:root, [data-theme="light"]` block and the `[data-theme="dark"]` block (regex `--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})`); import `accentTokens` from `src/theme/accent.ts` and `RESTAURANT` from `src/config/restaurant.ts` (Node 24 strips types). Check pairs per mode, AA = 4.5 unless noted:
  `text/bg`, `text/surface`, `text-muted/bg`, `text-muted/surface`, `text-muted/surface-2`,
  `on-accent/accent`, `accent-text/accent-soft`, `accent/surface` (3.0, UI component),
  each `status-*-text/status-*-bg`, `text-faint/surface` (3.0, placeholder only).
  Print a table; exit 1 on any failure. Add `"check:contrast": "node scripts/check-contrast.mjs"`.
- [ ] Step 2: Run it → FAIL (tokens not defined yet).
- [ ] Step 3: Rewrite the token section of `globals.css`: `:root, [data-theme="light"] {…}` and `[data-theme="dark"] {…}` with spec §1.1–1.2 values (`--status-*` included), plus legacy aliases (`--primary: var(--accent)`, `--primary-hover: var(--accent-hover)`, `--border-light: var(--border-strong)`, `--card-bg: var(--surface)`, `--input-bg: var(--surface)`, `--input-placeholder: var(--text-faint)`, `--btn-ghost-bg: var(--surface-2)`, `--btn-ghost-hover: var(--surface-3)`, `--glass-bg` light `rgba(250,247,242,.9)` / dark `rgba(20,17,15,.9)`, `--card-shadow: none`). Replace `html.dark`/`html.light` selectors (scrollbar etc.) with `[data-theme=…]`. Set `color-scheme: light|dark` per block.
- [ ] Step 4: `src/theme/accent.ts` per interface; `applyRestaurantTheme()` writes `:root,[data-theme="light"]{…}` and `[data-theme="dark"]{…}` accent vars into `<style id="qyou-accent">` (surface `#FFFFFF` light, `#1E1A17` dark). Call it in `src/main.tsx` before `createRoot`.
- [ ] Step 5: `ThemeContext`: storage key `qyou_theme`, default `'light'`, set `document.documentElement.dataset.theme` instead of classes. Add `useKitchenTheme()` hook (key `qyou_kitchen_theme`, default `'dark'`) returning `{ theme, toggle }`.
- [ ] Step 6: `tailwind.config.js` colors per "Tailwind color names" above; `fontFamily.display = ['Fraunces','Georgia','serif']`, `sans = ['Outfit','system-ui','sans-serif']`; `borderRadius` adds `control: '10px'`, `card: '12px'`, `sheet: '16px'` (keep existing keys until Task 14). `index.html`: load `Fraunces:opsz,wght@9..144,500` and `Outfit:wght@400;500`.
- [ ] Step 7: `src/theme/status.ts` — map `pending→waiting`, `confirmed,preparing→progress`, `ready→ready`, `served,paid→done`, `cancelled→cancelled`; labels: staff `Pending, Confirmed, Preparing, Ready, Served, Paid, Cancelled`; customer `Waiting for confirmation, Confirmed, Being prepared, Ready for you, Served, Paid, Cancelled`.
- [ ] Step 8: `npm run check:contrast` → PASS. `npm test` → PASS. `npm run build` → PASS.
- [ ] Step 9: Visual smoke check: open `/menu` at 375px in light and dark; pages render with new neutrals (hardcoded page colors remain until their task — expected).

### Task 4: Rename DeVerse → Qyou

**Files:** `index.html`, `public/index.html`, `package.json` (name `qyou-web`) and `package-lock.json` (`npm install --package-lock-only`), `server/index.ts`, `server/orderSyncPlugin.ts`, `src/context/BroadcastSync.ts`, `src/context/OrderContext.tsx`, `src/context/MenuAvailabilityContext.tsx`, `src/services/orderSync.ts`, `src/components/HelpAssistant.tsx`, `src/components/InvoiceModal.tsx`, `src/components/Navigation.tsx`, `src/pages/customer/TakeawayPickup.tsx`, `src/pages/customer/TokenValidation.tsx`, `src/pages/staff/QRCodeGenerator.tsx`, `src/pages/staff/SalesTracker.tsx`, `README.md`, `WEBAPP_OVERVIEW.md`, `ARCHITECTURE_PERFORMANCE.md`.

- [ ] Step 1: Storage and channel keys `deverse_*` → `qyou_*` (orders, my_orders, availability, theme, sync channels).
- [ ] Step 2: User-visible "DeVerse Cafe" → `RESTAURANT.name` where it names the restaurant; → "Qyou" where it names the product (titles, server logs, docs). `<title>`: "Qyou — Don't queue. Just Qyou."
- [ ] Step 3: `grep -rni deverse --exclude-dir={node_modules,dist,backend,.git,docs} .` → no output. `npm run build` → PASS.
- [ ] Step 4: Commit Phase 1: `feat: Qyou foundation — tokens, theming, config, rename`.

## Phase 2 — Components (one commit)

### Task 5: Shared UI components

**Files:** Create `src/components/ui/{Button,Card,StatusPill,Chip,TextInput,TextArea,QuantityStepper,BottomSheet,PageHeader,EmptyState,Wordmark}.tsx` and `index.ts`.

Props (all accept `className`):
- `Button`: `variant: 'primary'|'secondary'|'ghost'|'danger'` (default secondary), `size: 'md'|'lg'`, `fullWidth?`, `leftIcon?`, native button props. Heights 44/52px.
- `Card`: `as?`, `padding: 'none'|'sm'|'md'`, `interactive?`.
- `StatusPill`: `status: OrderStatus`, `audience?: 'staff'|'customer'` (default staff).
- `Chip`: `selected`, `onClick`, children.
- `TextInput` / `TextArea`: `label`, `hint?`, `error?`, native props; 44px input height.
- `QuantityStepper`: `value`, `onChange(next)`, `min=0`; minus at `min` calls `onChange(min)`.
- `BottomSheet`: `open`, `onClose`, `title?`, children; Escape and backdrop close; focus first focusable on open; bottom sheet below 768px, centered dialog ≥768px.
- `PageHeader`: `title`, `subtitle?`, `actions?`, `back?: () => void`.
- `EmptyState`: `icon`, `title`, `body?`, `action?`.
- `Wordmark`: `size: 'sm'|'md'|'lg'`, `withTagline?`; renders "Qyou" in `font-display`.

- [ ] Step 1: Implement using only token classes (no color literals).
- [ ] Step 2: `npm run build` → PASS; `node scripts/check-colors.mjs src/components/ui` → PASS (write `check-colors.mjs` now: regex `#[0-9a-fA-F]{3,8}\b|rgba?\(` over given paths, default `src`, prints file:line, exit 1 on hits; add `"check:colors"` script).
- [ ] Step 3: Commit `feat: shared Qyou UI components`.

## Phase 3 — Landing page (one commit)

### Task 6: Landing page at `/`

**Files:** Create `src/pages/Landing.tsx`, `src/pages/landing/{LandingHeader,Hero,HowItWorks,TeamFeatures,Faq,Contact,LandingFooter}.tsx`. Modify `src/App.tsx` (route `/` → Landing; Navigation hidden on `/`).

- [ ] Step 1: Build sections per spec §3. Contact renders phone (`tel:09468901590`, shown "0946 890 1590") always; email/Messenger buttons only when non-empty. "Try the live demo" → `PRODUCT.demoTablePath`. "Sign in" → `/staff/login`.
- [ ] Step 2: Responsive: single column <768px, two-column hero ≥1024px; no horizontal scroll at 375px.
- [ ] Step 3: Checks: `npm run build`; `npm run check:colors -- src/pages/Landing.tsx src/pages/landing`; screenshots at 375/768/1280 in light and dark; all links resolve.
- [ ] Step 4: Commit `feat: Qyou landing page`.

## Phase 4 — Customer screens (commit per task)

Each task: rebuild listed files on `src/components/ui`, apply spec §4, then run `npm run build`, `npm run check:colors -- <files>`, screenshot at 375px and 768px in light and dark, commit.

### Task 7: Customer shell, check-in, navigation
Files: `src/pages/customer/TokenValidation.tsx`, `src/components/CustomerHeader.tsx`, `src/components/Navigation.tsx` (customer part: Menu, Cart, Orders; staff part handled in Task 10), `src/components/ThemeToggle.tsx`, `src/components/HelpAssistant.tsx` (opened from a header icon, no floating button). Route `/search` → `<Navigate to="/menu?search=1" replace />`.

### Task 8: Menu, search, cart, checkout
Files: `src/pages/customer/Menu.tsx` (absorbs search: field + `?search=1` autofocus, sticky chips, compact rows with letter tile, QuantityStepper, sold-out rows, sticky cart bar), `src/pages/customer/Search.tsx` (deleted or reduced to the redirect), `src/pages/customer/Cart.tsx`, `src/components/OrderCheckoutModal.tsx` (→ BottomSheet; keep its current pricing behavior unchanged).

### Task 9: Order tracker, my orders, summary, pickup board
Files: `src/pages/customer/OrderStatus.tsx` (timeline from `confirmedAt/preparingAt/readyAt`, take-away code, EmptyState for unknown id), `src/pages/customer/MyOrders.tsx` (Active/Past, StatusPill customer labels), `src/components/InvoiceModal.tsx` (title "Order summary"), `src/pages/customer/TakeawayPickup.tsx`, `src/pages/shared/ExpiredSession.tsx`, `src/pages/NotFound.tsx`, `src/components/LoadingSpinner.tsx`.

## Phase 5 — Staff screens (commit per task)

Same checks as Phase 4, plus 1280px screenshots.

### Task 10: Staff shell and login
Files: `src/components/StaffPageShell.tsx` (remove `hidden md:flex`; sidebar ≥768px, bottom nav <768px with More sheet), `src/components/StaffHeader.tsx`, `src/components/Navigation.tsx` (staff part; Metrics removed from nav), `src/context/SidebarContext.tsx` if needed, `src/pages/staff/StaffLogin.tsx`.

### Task 11: Dashboard and tables
Files: `src/pages/staff/Dashboard.tsx`, `src/pages/staff/TableAvailability.tsx`.

### Task 12: Kitchen screen
Files: `src/pages/staff/OrderQueue.tsx`. Root element `data-theme={kitchenTheme}` via `useKitchenTheme()`; toggle in its header; columns New/Preparing/Ready; `useNow(30_000)` hook (create `src/hooks/useNow.ts`) drives elapsed labels; card edge `status-waiting-text` ≥10 min, `status-cancelled-text` ≥20 min.

### Task 13: Menu management, sales, QR codes, metrics
Files: `src/pages/staff/MenuManagement.tsx`, `src/pages/staff/SalesTracker.tsx`, `src/pages/staff/QRCodeGenerator.tsx` (print cards: restaurant name, table, QR, "Scan to order", tagline; print CSS uses black on white), `src/pages/staff/MetricsMonitor.tsx` (tokens only; stays reachable by URL).

## Phase 6 — Cleanup and verification (one commit)

### Task 14: Remove legacy, final sweep
- [ ] Delete `src/pages/Welcome.tsx`; remove its import/route.
- [ ] Remove legacy token aliases from `globals.css` and `tailwind.config.js`; fix any build errors by switching to new names.
- [ ] Remove unused CSS in `globals.css` (glow utilities, old gradients).
- [ ] `npm run check:colors` (all of `src`) → zero hits. `npm run check:contrast` → PASS. `npm test` → PASS. `npm run build` → PASS. `grep -rni deverse` (as Task 4) → empty.
- [ ] Screenshot matrix: every route × {375, 768, 1280} × {light, dark}; kitchen opens dark while app is light.
- [ ] Update `README.md` (Qyou, theming via `src/config/restaurant.ts`, scripts).
- [ ] Commit `chore: remove legacy theme tokens and DeVerse leftovers`.
