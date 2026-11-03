# Qyou — QR table ordering

**Don't queue. Just Qyou.** Guests scan the QR code on their table, order from their own phone
and get notified when the food is ready. Staff see orders on a dashboard and a kitchen screen.

Built with React 18, TypeScript, Vite, Tailwind CSS and Framer Motion.

## Running it

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173 (also serves the order API; staff PIN 123456)
```

## Where orders live

Every phone and staff screen shares the same orders, live. There are two backends behind one
client (`src/services/orderSync.ts`):

- **Supabase** (production, the Vercel site): Postgres stores the orders and Realtime pushes
  changes. Used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. Setup:
  [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- **Order server** (`server/orderSyncPlugin.ts`): the same rules over REST + SSE, kept in
  `server/orders.json`. Used by `npm run dev`, the e2e suite, and `npm run build && npm run server`
  (Express on port 3000; set `QYOU_STAFF_PIN`). `VITE_ORDER_BACKEND=server|supabase` forces one.

Either way the server prices every order from its own menu (the browser only sends item ids
and quantities), order ids are random UUIDs made on the phone (a retry can't create a second
order), and only signed-in staff can change an order's status. Guests' phones receive their own
orders plus a public board (table, pickup code, status), never other guests' items or dine-in
names.

## Screens

| Route | Screen |
|---|---|
| `/` | Product landing page |
| `/t/:tableId` | Table check-in (what a table's QR code opens) |
| `/menu`, `/cart`, `/order/:id`, `/my-orders` | Guest menu, cart, order tracker, order history |
| `/takeaway-pickup` | Take-away pickup board |
| `/staff/login` | Staff PIN sign-in |
| `/staff/dashboard`, `/staff/kitchen`, `/staff/tables` | Dashboard, kitchen screen, tables |
| `/staff/menu`, `/staff/sales`, `/staff/qr-codes` | Menu availability, sales, printable QR codes |
| `/staff/metrics` | Developer metrics (not in the navigation; some figures are simulated) |

## Onboarding a restaurant

Everything restaurant-specific lives in `src/config/restaurant.ts`: name, short name, logo
letter, accent color per mode (and the text color on it), currency and tables. Accent shades
(hover, soft fill, accent text) are computed from it at startup by `src/theme/accent.ts`, which
adjusts them until they meet WCAG AA, so any brand color works. Qyou's own marketing details
(tagline, contact phone, email, Messenger) are in `src/config/product.ts`; empty email or
Messenger values hide those buttons on the landing page.

## Design system

- Color tokens are CSS custom properties in `src/styles/globals.css`, scoped by
  `data-theme="light|dark"`. Any subtree can set its own mode; the kitchen screen defaults to
  dark (`qyou_kitchen_theme`) while the rest of the app defaults to light (`qyou_theme`).
- Tailwind color names map to the tokens (`bg`, `surface`, `ink`, `ink-muted`, `accent`,
  `status-*`…). `.tsx` files contain no hex or `rgb()` literals.
- Shared components are in `src/components/ui` (Button, Card, Ticket, StatusPill, BottomSheet,
  QuantityStepper, …). Order status labels and colors come from `src/theme/status.ts`.
- Type: Archivo (expanded for display text) and JetBrains Mono for labels and pickup codes.
- Motion respects the device's reduced-motion setting.

## Checks

```bash
npm test                 # color math, order rules, and the Supabase schema on in-process Postgres (node --test)
npm run test:e2e         # every screen (axe, overflow) plus a two-device order flow (Playwright)
npm run check:contrast   # every text/background token pair in both modes meets WCAG AA
npm run check:colors     # fails on hex/rgb() color literals in .tsx files (default: src)
npm run build
```

## Known limitations

This is a working prototype, not yet production-ready:

- Staff share one 6-digit PIN per restaurant (a Supabase Auth account), so there is no
  per-person audit trail.
- Menu name/price edits and sold-out switches are not shared across devices, and the server
  doesn't know about sold-out switches yet. Prices on the menu come from
  `src/constants/menu.ts`; the server charges what the database's `menu_items` says (a test
  checks they match).
- Add-on prices are shown at checkout but not included in the stored order total.
- "Free table" marks a table's unpaid (and cancelled) orders as paid.

## License

Proprietary - Qyou
