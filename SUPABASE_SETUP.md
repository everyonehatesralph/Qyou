# Supabase setup

Qyou's shared orders run on one Supabase project. About 10 minutes, all in the Supabase dashboard.

## 1. Create the project

[supabase.com](https://supabase.com) → **New project**. For restaurants in the Philippines pick
the **Southeast Asia (Singapore)** region. Keep the database password somewhere safe; the app
never needs it.

Free projects pause after about a week without traffic. A demo that has to stay up needs the
Pro plan or a visit now and then.

## 2. Create the tables and functions

**SQL Editor** → **New query** → paste all of
[`supabase/migrations/20261104000000_shared_orders.sql`](supabase/migrations/20261104000000_shared_orders.sql) → **Run**.

It is safe to run again later. The menu in `src/constants/menu.ts` is only the starting
menu: running the file again never undoes changes staff made on the Menu screen.

## 3. Create the staff sign-in

Staff sign in with a 6-digit PIN. Behind it is one Supabase Auth user per restaurant whose
password is the PIN; its email is `staffEmail` in `src/config/restaurant.ts`
(`demo-cafe-staff@example.com` for the demo). No email is ever sent to it.

1. **Authentication** → **Users** → **Add user** → **Create new user**: that email, the PIN as
   the password, and tick **Auto Confirm User**.
2. Make it staff. In the SQL Editor:

   ```sql
   insert into public.staff_members (user_id)
   select id from auth.users where email = 'demo-cafe-staff@example.com'
   on conflict do nothing;
   ```

3. Recommended: **Authentication** → **Sign In / Providers** → turn off **Allow new users to
   sign up**. Accounts that are not in `staff_members` can't do anything anyway, but there is
   no reason to let strangers create them.

To change the PIN, set a new password on that user (**Authentication** → **Users** → the user
→ **Reset password** / **Update user**). Signed-in tablets stay signed in until they sign out.

A 6-digit PIN has a million combinations and Supabase throttles repeated sign-in attempts,
which is fine for a demo; for a paying restaurant consider per-staff accounts.

## 4. Connect the app

**Project Settings** → **API Keys**: copy the **Project URL** and the **anon** key (or the
**publishable** key). Both are public: they ship inside the web app. Never use the
`service_role` / secret key in the app.

Locally, in `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon or publishable key>
```

On Vercel, add the same two variables for **Production** and **Preview**, then redeploy.

## 5. Paying online (PayMongo, optional)

Guests can pay with GCash, Maya, QR Ph or a card before their order goes to the kitchen, or keep
paying at the counter. It runs as a Vercel Function (`api/payments`), next to the app. Without
these settings the checkout simply has no "Pay now" choice.

1. Sign the café up at [paymongo.com](https://paymongo.com). Test keys work at once; live keys
   come after PayMongo verifies the business.
2. **Developers** → **API keys**: copy the **secret key** (`sk_test_…` while testing).
3. Supabase **Project Settings** → **API Keys**: copy the **service_role** key (or a **secret**
   key). It is what lets the payment function record a payment; it must never be a `VITE_`
   variable, which would put it in the web app.
4. On Vercel (**Settings** → **Environment Variables**, for Production and Preview):

   ```
   PAYMONGO_SECRET_KEY=sk_test_…
   SUPABASE_SERVICE_ROLE_KEY=<service_role or secret key>
   ```

   (`SUPABASE_URL` is optional; `VITE_SUPABASE_URL` is used otherwise. `PAYMONGO_METHODS`
   picks the methods shown, default `gcash,paymaya,qrph,card`; leave out any your PayMongo
   account hasn't switched on.)
5. Redeploy, then add the webhook so payments are recorded even if a guest closes the page
   right after paying. PayMongo **Developers** → **Webhooks** → add
   `https://<your site>/api/payments/webhook` with the event `checkout_session.payment.paid`,
   and put its signing secret on Vercel as `PAYMONGO_WEBHOOK_SECRET=whsk_…`. Redeploy once more.

Without the webhook it still works: the guest's phone asks when it comes back from the payment
page, and the server checks with PayMongo itself. Preview deployments behind Vercel's login
can't receive webhooks, so they rely on that alone.

Going live: switch both PayMongo values to the live key and the live webhook's secret. A test
key only accepts test webhooks and a live key only live ones.

## What the database enforces

- Guests (anon key, no sign-in) can only call `place_order`, `get_orders` (their own orders,
  by id) and `cancel_order` (until the kitchen starts), and read `order_board`, which has no
  items, totals, notes or dine-in names.
- `place_order` prices the order from `menu_items`, add-ons included, and ignores anything the
  browser says about prices. Sold-out and removed items are refused, and so is an order without
  a table. Sending the same order id twice returns the first order.
- Only staff can set how many tables there are (`set_table_count`); a table with open orders
  can't be removed. `place_order` refuses tables that don't exist or were removed, and takes
  the table's name from `restaurant_tables`.
- Item options live in `option_groups` (choices with extra prices). `place_order` adds the
  chosen options to each item's price, keeps different choices as separate lines, and refuses
  a choice the item doesn't offer or a missing required one. Only staff change groups
  (`save_option_group`, `remove_option_group`) or which groups an item asks for.
- Only staff can change the menu (`save_menu_item`, `set_menu_item_available`,
  `remove_menu_item`). Removed items are kept, switched off, so old orders still name them.
- Each order gets the day's next queue number from `order_counters`, taken under a row lock so
  two orders at the same moment never share one; numbers restart at 1 at midnight Manila time
  (`restaurant_day()`). A number is unique only with its day.
- Paying online: `start_checkout` prices a pay-now order exactly like `place_order` and keeps it
  in `checkouts`; the order only exists once `confirm_checkout` records the payment, after the
  server has checked it with PayMongo (same session, exact amount). Then it gets the day's next
  queue number and goes to the kitchen. Only the service role (the payment function) can call
  these or read `checkouts`. Confirming twice returns the same order.
- Guests can't cancel an order paid online (`cancel_order` refuses it); staff marking it served
  settles it (status paid), since there is nothing left to collect.
- Only users in `staff_members` can read `orders` or call `set_order_status`.
- Nobody can insert, update or delete table rows directly.
- `orders`, `order_board`, `menu_items`, `option_groups` and `restaurant_tables` are in the
  `supabase_realtime` publication, so screens, guests' menus and check-in update live.

`npm test` runs this migration on an in-process Postgres and checks all of the above.
