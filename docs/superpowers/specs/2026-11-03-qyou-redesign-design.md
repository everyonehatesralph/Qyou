# Qyou redesign — design spec

Date: 2026-11-03
Branch: `redesign/qyou-daylight` (based on `fix/build-and-prod-server`)
Status: approved in conversation, pending written review

## Goal

Turn the DeVerse Cafe prototype into **Qyou**, a QR table-ordering product sold to many
restaurants, with a new palette, a consistent component set, every screen redesigned, and
a product landing page.

Tagline: **"Don't queue. Just Qyou."** (Qyou = "queue" + "you").

## Decisions

| Topic | Decision |
|---|---|
| Brand scope | Qyou is the product. Each restaurant is a theme (name, logo, accent). "DeVerse" is removed everywhere. |
| Menu header | Restaurant's own name, plus a small "Ordering by Qyou" mark. |
| Demo restaurant | "Qyou Demo Café". |
| Palette | "Daylight": warm cream and ink, accent used only for actions. |
| Modes | Light is the default for customers, dashboard and admin pages. The kitchen screen defaults to dark. Users can still toggle. |
| Approach | All colors move to CSS variables; shared UI components; every page rebuilt on them. |
| Type | Fraunces (display: restaurant name, page and section headings). Outfit (everything else). |
| Landing page | Lives at `/`, replacing the current customer welcome screen. |
| Metrics page | Removed from staff navigation (its numbers are randomly generated). Route kept. |

## 1. Foundation

### 1.1 Color tokens

Defined once in `src/styles/globals.css` as CSS custom properties. Tailwind color names map to
them (`tailwind.config.js`). No TSX file may contain a hex or `rgba()` color literal after the
redesign; the only literals live in `globals.css` and the restaurant config.

Light (`:root`, `[data-theme="light"]`):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF7F2` | Page background |
| `--surface` | `#FFFFFF` | Cards, sheets, inputs |
| `--surface-2` | `#F3EEE6` | Subtle fills, chips, letter tiles |
| `--surface-3` | `#EAE3D8` | Pressed / hover fills |
| `--border` | `#E9E2D8` | Hairlines |
| `--border-strong` | `#D8CFC2` | Input borders, emphasized dividers |
| `--text` | `#1F1A17` | Primary text |
| `--text-muted` | `#6F655C` | Supporting text |
| `--text-faint` | `#9C9188` | Placeholders, captions, disabled |
| `--accent` | from restaurant config (`#9A5A0E` default) | Primary actions |
| `--accent-hover` | `color-mix(in srgb, var(--accent) 85%, black)` | |
| `--on-accent` | from config (`#FFFFFF` default) | Text on accent |
| `--accent-soft` | `color-mix(in srgb, var(--accent) 12%, var(--surface))` | Selected chips, tiles |
| `--accent-text` | `color-mix(in srgb, var(--accent) 80%, black)` | Accent-colored text on light fills |

Dark (`[data-theme="dark"]`):

| Token | Value |
|---|---|
| `--bg` | `#14110F` |
| `--surface` | `#1E1A17` |
| `--surface-2` | `#27221E` |
| `--surface-3` | `#312B26` |
| `--border` | `#332C27` |
| `--border-strong` | `#453C35` |
| `--text` | `#F3ECE4` |
| `--text-muted` | `#A89A8C` |
| `--text-faint` | `#776B60` |
| `--accent` | from config (`#E0A04A` default) |
| `--on-accent` | from config (`#1A1208` default) |
| `--accent-hover` | `color-mix(in srgb, var(--accent) 85%, white)` |
| `--accent-soft` | `color-mix(in srgb, var(--accent) 18%, var(--surface))` |
| `--accent-text` | `color-mix(in srgb, var(--accent) 85%, white)` |

### 1.2 Status colors

One meaning per hue. Every status pill also shows its text label.

| Status | Group | Light bg / text | Dark bg / text |
|---|---|---|---|
| pending | waiting (amber) | `#FDF0D5` / `#7A4A06` | `#3A2C12` / `#F5C76B` |
| confirmed, preparing | in progress (blue) | `#E3EDFD` / `#1E46A0` | `#17284A` / `#9DBDF5` |
| ready | ready (green) | `#DFF3E5` / `#14612F` | `#143322` / `#86D9A2` |
| served, paid | done (gray) | `#EFEAE3` / `#4F463F` | `#2A2522` / `#C9BDB1` |
| cancelled | cancelled (red) | `#FBE4E4` / `#8F1D1D` | `#3B1616` / `#F4A3A3` |

Tokens: `--status-{waiting,progress,ready,done,cancelled}-{bg,text}`. Generic feedback
(`--success`, `--danger`, `--warning`) reuses the ready, cancelled and waiting text colors.

### 1.3 Theme scoping

- Mode is applied with `data-theme="light|dark"` on `<html>` (replacing the current
  `html.light` / `html.dark` classes in `ThemeContext`).
- Any subtree can override it with its own `data-theme` attribute. The kitchen screen root sets
  its own mode from a separate setting, `qyou_kitchen_theme`, which defaults to dark and has its
  own toggle on the kitchen screen.
- App-wide default: light. Toggle stays in the header. Stored key: `qyou_theme`.

### 1.4 Restaurant config

New file `src/config/restaurant.ts`, the single place a new restaurant is onboarded:

```ts
export const RESTAURANT = {
  name: 'Qyou Demo Café',
  shortName: 'Demo Café',
  logoText: 'Q',                       // letter tile when no logo image
  accent: { light: '#9A5A0E', dark: '#E0A04A' },
  onAccent: { light: '#FFFFFF', dark: '#1A1208' },
  currency: '₱',
  tables: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `Table ${i + 1}` })),
}
```

Table definitions currently duplicated in five files move here.

Accent tokens are applied at startup by `src/theme/applyRestaurantTheme.ts`: it computes
`--accent`, `--accent-hover`, `--accent-soft`, `--accent-text` and `--on-accent` for both modes
by mixing hex values in JavaScript and injects one `<style>` element. CSS `color-mix()` is
**not** used, so older iOS Safari (before 16.2) renders correctly. The `color-mix` expressions in
the tables above describe the math, not the shipped CSS.

New file `src/config/product.ts` for Qyou's own marketing details:

```ts
export const PRODUCT = {
  name: 'Qyou',
  tagline: "Don't queue. Just Qyou.",
  contact: {
    phone: '09468901590',
    email: '',        // filled in by the owner later; hidden while empty
    messenger: '',    // m.me link; hidden while empty
  },
  demoTablePath: '/t/1',
}
```

### 1.5 Typography and sizing

- Fraunces 500 (Google Fonts) for display text; Outfit 400/500 for UI. Two weights only.
- Radius: 10px controls, 12px cards, 16px sheets, 999px pills.
- Minimum touch target 44px. Shadows minimal; cards are separated by borders, not glows.
- Contrast: every text/background token pair meets WCAG AA (4.5:1 body, 3:1 large text) in
  both modes; `--text-faint` is used only for placeholders and captions.

### 1.6 Rename

"DeVerse" / "deverse" is removed from: `index.html` and `public/index.html` titles, `package.json`
name (`qyou-web`), localStorage keys and BroadcastChannel names (`deverse_*` → `qyou_*`),
server log lines, page copy, `README.md`, `WEBAPP_OVERVIEW.md`, `ARCHITECTURE_PERFORMANCE.md`.
Renaming storage keys resets saved demo data in browsers once; acceptable before launch.

## 2. Shared components

Location `src/components/ui/`. Each reads only tokens.

| Component | Purpose |
|---|---|
| `Button` | Variants: primary (accent), secondary (outlined), ghost, danger. Sizes md (44px), lg (52px). |
| `Card` | Surface + border + 12px radius. |
| `StatusPill` | Single mapping of all 7 order statuses to label + status tokens. Replaces the per-page `STATUS_CONFIG` objects. |
| `Chip` | Category filter chip; selected state uses `--text` fill. |
| `TextInput`, `TextArea` | Labeled fields with focus ring in accent. |
| `QuantityStepper` | − n + control used on menu rows and in the cart. |
| `BottomSheet` | Mobile sheet used for checkout and order details; becomes a centered dialog at ≥768px. |
| `PageHeader` | Title (Fraunces), optional subtitle and actions. |
| `EmptyState` | Icon, headline, one line, optional action. |
| `Wordmark` | "Qyou" wordmark, used on landing, staff shell, and the "Ordering by Qyou" mark. |

## 3. Landing page (`/`)

Audience: restaurant and café owners in the Philippines.

Sections, in order:
1. Header: wordmark, anchors (How it works, Features, FAQ), **Sign in** (→ `/staff/login`),
   **Book a demo** (scrolls to contact).
2. Hero: tagline, one-paragraph explanation, **Try the live demo** (→ `PRODUCT.demoTablePath`),
   **Book a demo**; phone preview of the menu screen.
3. How it works: Scan, Order, Get notified.
4. For your team: kitchen screen, live order queue, menu and sold-out control, sales tracker,
   printable table QR codes. Only features that exist today.
5. FAQ: no app download, works in any phone browser, what the restaurant needs to start
   (a phone or tablet for staff, Wi-Fi).
6. Contact: phone (`tel:` and number shown), email and Messenger buttons rendered only when their
   config values are non-empty.
7. Footer: wordmark, tagline, year.

Rules: no invented statistics, testimonials, customer logos, or payment-method claims.

## 4. Customer screens

| Screen | Design |
|---|---|
| Table check-in `/t/:id` | Restaurant name (Fraunces), table chip, name field, one primary button. |
| Menu `/menu` | Header: restaurant name, "Hi {name} · Table n", help and theme icons. Search field at top. Sticky category chips. Compact rows: 40–48px photo or letter tile, name, price, stepper or + button. Sold-out rows grayed with "Sold out today". Sticky bottom "View cart · n items · total" bar. |
| Bottom navigation | Menu, Cart, Orders. `/search` redirects to `/menu` with the search field focused. |
| Cart `/cart` | Item rows with steppers and notes, summary card, primary "Checkout" opening the checkout sheet. |
| Checkout sheet | Dine in / Take away segmented choice, add-ons list, notes, total, "Place order". |
| Order tracker `/order/:id` | Status headline (Fraunces), StatusPill, vertical timeline (Received, Confirmed, Preparing, Ready) with times, take-away code in large type for take-away orders, note about the ready ring. Unknown order id shows an EmptyState instead of loading forever. |
| My orders `/my-orders` | Sections "Active" and "Past" using StatusPill; paid orders count as past. |
| Order summary modal | Renamed from "Official Receipt" to "Order summary"; restyled. |
| Take-away pickup board | Restyled; large codes, ready ones in the ready color. |

Removed: the old customer `Welcome` page (replaced by the landing page) and its "Staff Access"
button.

## 5. Staff screens

| Screen | Design |
|---|---|
| Login | Light PIN pad with wordmark. (PIN logic unchanged.) |
| Shell | Sidebar at ≥768px (wordmark, restaurant name, nav, sign out). Bottom nav below 768px with Dashboard, Kitchen, Tables, Menu, More; More opens a sheet with Sales, QR codes, theme toggle and Sign out. Fixes staff pages rendering blank on phones. Metrics removed from nav. |
| Dashboard | Four compact KPI cards, incoming orders list with Confirm, awaiting payment, table grid. |
| Kitchen `/staff/kitchen` | Dark by default. Columns New / Preparing / Ready. Large cards: table number large, items, notes, elapsed time refreshed every 30s, card edge turns amber after 10 min and red after 20 min. Large action buttons. |
| Menu management | List with availability toggles and edit fields on the new components. |
| Tables | Grid of table cards colored by status group. |
| Sales | KPI cards and charts using status/accent tokens. |
| QR codes | Printable cards: restaurant name, table number, QR, "Scan to order", tagline. |

## 6. Out of scope

Tracked separately; this redesign keeps current behavior:
- Backend, security and staff authentication.
- Add-on prices not included in the stored order total.
- "Free table" marking unpaid and cancelled orders as paid.
- Menu edits not shared across devices.

## 7. Verification

- `npm run build` passes after every step.
- `grep` finds no hex or `rgba()` color literals in `src/**/*.tsx`.
- A script checks contrast for every text/background token pair in both modes (AA).
- Screenshots of every screen at 375px, 768px and 1280px, in light and dark, reviewed before
  each commit of a screen group.
- The kitchen screen opens dark while the rest of the app is light.

## 8. Order of work

1. Tokens, theme scoping, restaurant and product config, Qyou rename.
2. Shared components.
3. Landing page.
4. Customer screens.
5. Staff screens.
6. Cleanup: delete the old Welcome page and unused styles, final color-literal sweep.

One commit per step.

## Revision 1 (2026-11-03): bolder identity and motion

Requested by the owner after reviewing the first pass ("too generic"). Decisions, as
answered in conversation: big motion on the landing page, subtle motion in the app, and a
bolder look built on the queue-ticket idea. This revision replaces the parts of §1.1, §1.5
and §3 it contradicts.

- **Concept:** the queue ticket. Perforated ticket shapes (`Ticket` component, `.ticket`,
  `.perforation`, `.receipt-edge` utilities) for order numbers, pickup codes and the contact
  card; "Nº" meta labels in a mono face.
- **Neutrals:** light `bg #F3F1EC`, `surface #FFFFFF`, `text #141414`, `text-muted #5F5B54`;
  dark `bg #111110`, `surface #1A1918`, `text #F3F1EC`, `text-muted #A8A39A` (full values in
  `globals.css`). Status colors unchanged.
- **Demo accent:** "ticket orange" `#FF5A1F` light / `#FF6A33` dark with near-black text on it
  (`#141414`). Accent shades are now adaptive: hover moves away from the on-accent color, and
  `--accent-text` is darkened/lightened until it reads at ≥ 4.6:1 on surface and soft fill,
  so any restaurant accent stays AA.
- **Type:** Archivo (variable width/weight) for display and UI; display text uses
  `.font-display` (expanded 112%, weight 760). JetBrains Mono 500 for small meta labels.
  Replaces Fraunces + Outfit and the two-weight rule.
- **Shape:** pill buttons; soft layered shadows for elevated objects (`shadow-pop`,
  `shadow-lift`); borders still separate flat cards.
- **Landing motion:** headline mask reveal; a 3D hero scene (phone, now-serving ticket,
  table QR card, ready notice) that follows the pointer and turns with scroll; ticker tape;
  a pinned four-step scroll story (scan → order → cook → notified) with the phone turning and
  a kitchen ticket flying out; a live kitchen board animating tickets between columns;
  pointer-tilt feature cards; animated FAQ; reading-progress bar.
- **App motion (subtle):** add-to-cart flight and badge pop, stepper number ticks, sheet and
  bar springs, tracker step and headline transitions, kitchen cards sliding between columns.
- **Reduced motion:** `MotionConfig reducedMotion="user"` plus a CSS reduced-motion rule.

## Revision 2 (2026-11-03): Tomato & Slate, analytics

Requested by the owner after reviewing Revision 1. Replaces the neutrals and demo accent
from Revision 1; everything else stands.

- **Neutrals:** light is slate (`bg #F8FAFC`, `surface #FFFFFF`, `text #0F172A`,
  `text-muted #475569`); dark is neutral charcoal, not slate, because slate reads as navy at
  dark-mode lightness (`bg #0F0F11`, `surface #18181B`, `text #F4F4F5`, `text-muted #A6A6AF`).
  Full values in `globals.css`. Status colors unchanged.
- **Demo accent:** tomato `#D92D20` light with white text on it, `#FB7A6A` dark with
  charcoal text on it. The adaptive accent rules from Revision 1 still apply.
- **Chart color:** a separate data hue `--chart` (blue, `#2563EB` light / `#4A8CF7` dark) so
  bars never read as buttons. Checked at ≥ 3:1 on `surface` and `surface-2`.
- **Staff shell:** the inset rounded content panel on desktop is kept (sidebar on `surface`,
  page inside a rounded, bordered `bg` panel).
- **Analytics:** the dashboard gets a "Today at a glance" section (revenue and orders vs
  yesterday, average wait and prep time, orders by hour, top sellers, busiest tables). The
  Sales page and its nav item are named "Analytics" again.

## Revision 3 (2026-11-04): phones first, accessibility

Requested by the owner: most guests are on phones; every screen must work at every size and
be accessible. Checked by a second e2e suite (`e2e/devices.spec.ts`) on 10 more sizes: 320,
360, 390 and 430 px phones, phones turned sideways (667×375, 844×390), tablets both ways
(820×1180, 1024×768) and wide desktops (1440, 1920), plus every sheet.

- **Targets:** every control is at least 44×44 px on touch screens (chips, kitchen "Hide",
  table "Free table", footer and header links, the ready-alert OK). Chart columns, which only
  focus for their tooltip, are exempt from 44 but still at least 24 (WCAG 2.5.8).
- **Short screens** (`short:` variant, height ≤ 600 px: phones turned sideways and the smallest phones): the
  guest and staff headers scroll away, category chips stop sticking, the tab bars shrink to
  48 px with icon and label side by side, cart bars shrink, sheets scroll as one piece, the PIN
  keypad is shorter, and the landing story becomes a plain list instead of a pinned panel.
- **Small phones:** under 360 px the guest header shows the short restaurant name and menu
  and cart rows drop the decorative letter tile; menu descriptions show two lines on phones;
  names and labels wrap instead of being cut off; the order page's two buttons stack.
- **Screen changes:** every route sets its own page title, starts at the top (Back/Forward keep
  their position) and moves focus to the new page's heading. A "Skip to content" link is the
  first stop on every page.
- **Screen readers:** one polite live region (`announce`) reads out cart changes and live order
  status changes; staff PIN progress is announced; the landing illustrations are hidden from
  screen readers (the copy beside them says the same), and the full four steps of "How it
  works" are always in the reading order. Every page has a `main` landmark and an `h1`.
- **Keyboard:** focus follows the Add button into the stepper and back; after a sheet closes,
  focus returns to what opened it, or to the page heading if that is gone; the order-type and
  other segmented controls are proper radio groups (one tab stop, arrow keys); a sheet body
  that scrolls with nothing focusable in it takes focus itself. Scroll padding keeps focused
  controls clear of sticky headers and bottom bars (WCAG 2.4.11).
- **Text:** real labels are at least 12 px (decorative mock-ups excepted); fields stay 16 px so
  iOS does not zoom; Windows High Contrast marks selected chips, tabs, radios and switches
  with the system highlight.

## Revision 4 (2026-11-04): a photo menu

Requested by the owner, with a delivery-app menu as the reference: guests choose by photo.

- **Guest menu:** a two-column photo grid on phones (three from 640 px). Each card is the
  photo, name and price; a round + sits on the photo's corner and turns into the − n +
  stepper. Tapping the card opens a sheet with a large photo, the description and the add
  control. Sold-out items are greyed with a "Sold out" tag.
- **Sections, not filters:** underlined section tabs (Popular, Coffee, Tea, Pastry, Food)
  jump to their section and follow the scroll. Popular is the four most-ordered items, or
  house picks until there are enough orders. Search shows a flat grid of matches.
- **Photos:** each demo item has a built-in photo in `public/menu` (free Unsplash photos,
  640×640 WebP, about 450 KB for all ten; links in `public/menu/CREDITS.md`). Items without a
  photo show their first letter.
- **Staff photo editing:** the item editor shows the photo with Change photo, Remove photo
  and Use original photo; changes apply on Save. Picked photos are centre-cropped to 640×640
  and re-encoded in the browser (about 50–90 KB). They are stored on that device only
  (`src/services/menuPhotos.ts`) until the shared backend stores them; the editor says so.

## Revision 5 (2026-11-04): pinned staff panel

- From 768 px the rounded staff content panel is pinned to the window like the sidebar and
  its content scrolls inside it (sticky page header included), so the panel's corners never
  slide away. Phones and short screens keep normal page scrolling.
