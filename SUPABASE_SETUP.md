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

## What the database enforces

- Guests (anon key, no sign-in) can only call `place_order`, `get_orders` (their own orders,
  by id) and `cancel_order` (until the kitchen starts), and read `order_board`, which has no
  items, totals, notes or dine-in names.
- `place_order` prices the order from `menu_items`, add-ons included, and ignores anything the
  browser says about prices. Sold-out and removed items are refused, and so is an order without
  a table. Sending the same order id twice returns the first order.
- Only staff can change the menu (`save_menu_item`, `set_menu_item_available`,
  `remove_menu_item`). Removed items are kept, switched off, so old orders still name them.
- Each order gets the day's next queue number from `order_counters`, taken under a row lock so
  two orders at the same moment never share one; numbers restart at 1 at midnight Manila time
  (`restaurant_day()`). A number is unique only with its day.
- Only users in `staff_members` can read `orders` or call `set_order_status`.
- Nobody can insert, update or delete table rows directly.
- `orders`, `order_board` and `menu_items` are in the `supabase_realtime` publication, so
  screens and guests' menus update live.

`npm test` runs this migration on an in-process Postgres and checks all of the above.
