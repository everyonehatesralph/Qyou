-- Qyou shared orders.
-- Run once in the Supabase SQL editor (or with `supabase db push`). Safe to run again.
--
-- Who can do what:
--   guests (anon key, no sign-in)  place orders, read and cancel their own orders by id,
--                                  read the public order board (no items, prices or dine-in names)
--   staff (signed in + listed in   read every order, change any order's status, edit the menu
--          public.staff_members)       and set how many tables there are
-- Nobody writes tables directly: every write goes through a function below, which prices
-- orders from public.menu_items and ignores whatever the browser says things cost.

-- ─── Menu: what guests see and what the server charges ──────────────────────
-- Staff edit it in the app (functions below); every phone follows it live.
create table if not exists public.menu_items (
  id          integer primary key,
  name        text not null,
  price       numeric(10, 2) not null check (price >= 0),
  category    text not null,
  description text not null default '',
  addon       boolean not null default false,  -- an extra picked at checkout
  available   boolean not null default true,   -- false = sold out
  active      boolean not null default true,   -- false = removed; kept so old orders keep their ids
  updated_at  timestamptz not null default now()
);
alter table public.menu_items add column if not exists description text not null default '';
alter table public.menu_items add column if not exists addon boolean not null default false;
alter table public.menu_items add column if not exists active boolean not null default true;

-- The starting menu: src/constants/menu.ts (a test checks they match). Only fills an empty
-- menu, so running this again never undoes staff edits.
insert into public.menu_items (id, name, price, category, description, addon) values
  (1,   'Signature Espresso',  120, 'Coffee',  'Bold single-origin shot with rich crema',         false),
  (2,   'Caramel Macchiato',   165, 'Coffee',  'Velvety milk layered with espresso & caramel',     false),
  (3,   'Matcha Latte',        175, 'Coffee',  'Ceremonial grade matcha with steamed oat milk',    false),
  (4,   'Cold Brew',           155, 'Coffee',  '18-hour steeped, smooth and naturally sweet',      false),
  (5,   'Chamomile Honey Tea', 110, 'Tea',     'Soothing floral with a touch of raw honey',        false),
  (6,   'Iced Lemon Verbena',  125, 'Tea',     'Refreshing citrus herb blend, served iced',        false),
  (7,   'Butter Croissant',    95,  'Pastry',  'Freshly baked with premium European butter',       false),
  (8,   'Almond Danish',       115, 'Pastry',  'Flaky pastry with house-made almond cream',        false),
  (9,   'Avocado Toast',       195, 'Food',    'Smashed avo on sourdough, cherry tomato, egg',     false),
  (10,  'Club Sandwich',       225, 'Food',    'Triple-deck with chicken, bacon & house sauce',    false),
  (101, 'Extra Espresso Shot', 30,  'Add-ons', '', true),
  (102, 'Oat Milk Upgrade',    25,  'Add-ons', '', true),
  (103, 'Extra Sugar',         0,   'Add-ons', '', true),
  (104, 'Less Ice',            0,   'Add-ons', '', true),
  (105, 'Whipped Cream',       20,  'Add-ons', '', true),
  (106, 'Caramel Syrup',       15,  'Add-ons', '', true)
on conflict (id) do nothing;

-- ─── Tables: which tables the restaurant has ────────────────────────────────
-- Staff set how many (Tables screen); orders and check-ins only work for an active table.
-- Removed tables stay, switched off, so old orders keep their table.
create table if not exists public.restaurant_tables (
  id         integer primary key check (id between 1 and 200),
  label      text not null,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

-- The starting tables (RESTAURANT.tables in src/config/restaurant.ts). Only fills an empty
-- list, so running this again never undoes what staff set.
insert into public.restaurant_tables (id, label)
select g, 'Table ' || g from generate_series(1, 10) g
where not exists (select 1 from public.restaurant_tables)
on conflict (id) do nothing;

-- ─── Staff: Supabase Auth users allowed to run the floor ─────────────────────
create table if not exists public.staff_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key,                       -- made by the guest's phone; also its key to the order
  board_id      uuid not null unique default gen_random_uuid(), -- public id on the order board
  number        integer not null,                       -- the day's queue number staff call out (Nº 042)
  order_day     date not null,                          -- the restaurant's day that number belongs to
  table_id      integer not null check (table_id >= 0),
  table_name    text not null,
  customer_name text not null default '',
  items         jsonb not null,                         -- [{ id, name, price, quantity }] priced by the server
  total         numeric(10, 2) not null check (total >= 0),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled')),
  order_type    text not null check (order_type in ('dineIn', 'takeaway')),
  takeaway_code text not null default '',
  notes         text,
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  preparing_at  timestamptz,
  ready_at      timestamptz,
  served_at     timestamptz,
  paid_at       timestamptz,
  cancelled_at  timestamptz
);
-- Earlier versions numbered orders with one ever-growing identity; numbers are per day now
alter table public.orders add column if not exists order_day date;
alter table public.orders alter column number drop identity if exists;
alter table public.orders drop constraint if exists orders_number_key;
update public.orders set order_day = (created_at at time zone 'Asia/Manila')::date where order_day is null;
alter table public.orders alter column order_day set not null;
-- A queue number repeats every day, so it is only unique together with its day
create unique index if not exists orders_day_number_key on public.orders (order_day, number);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_table_recent_idx on public.orders (table_id, created_at desc);

-- ─── Queue numbers: 001, 002… from the start of each day ────────────────────
-- One row per day. Taking the next number locks that day's row, so two orders placed at
-- the same moment can never get the same number.
create table if not exists public.order_counters (
  day         date primary key,
  last_number integer not null
);
-- Orders from before this table existed: each day carries on after its highest number
insert into public.order_counters as c (day, last_number)
select order_day, max(number) from public.orders group by order_day
on conflict (day) do update set last_number = greatest(c.last_number, excluded.last_number);

-- The restaurant's calendar day. Its timezone lives here and in RESTAURANT.timeZone.
create or replace function public.restaurant_day() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Manila')::date
$$;

-- ─── Order board: what any guest may see about other people's orders ────────
-- Table occupancy for check-in and the take-away pickup screen. No items, totals or notes;
-- names only for take-away orders, which the pickup screen calls out.
create table if not exists public.order_board (
  board_id      uuid primary key references public.orders (board_id) on delete cascade,
  table_id      integer not null,
  table_name    text not null,
  order_type    text not null,
  takeaway_code text not null,
  customer_name text not null,
  status        text not null,
  created_at    timestamptz not null,
  confirmed_at  timestamptz,
  preparing_at  timestamptz,
  ready_at      timestamptz,
  served_at     timestamptz,
  paid_at       timestamptz,
  cancelled_at  timestamptz
);
create index if not exists order_board_created_at_idx on public.order_board (created_at desc);

create or replace function public.sync_order_board() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.order_board as b (
    board_id, table_id, table_name, order_type, takeaway_code, customer_name, status, created_at,
    confirmed_at, preparing_at, ready_at, served_at, paid_at, cancelled_at
  ) values (
    new.board_id, new.table_id, new.table_name, new.order_type, new.takeaway_code,
    case when new.order_type = 'takeaway' then new.customer_name else '' end,
    new.status, new.created_at,
    new.confirmed_at, new.preparing_at, new.ready_at, new.served_at, new.paid_at, new.cancelled_at
  )
  on conflict (board_id) do update set
    status = excluded.status,
    confirmed_at = excluded.confirmed_at, preparing_at = excluded.preparing_at,
    ready_at = excluded.ready_at, served_at = excluded.served_at,
    paid_at = excluded.paid_at, cancelled_at = excluded.cancelled_at;
  return new;
end $$;

drop trigger if exists orders_sync_board on public.orders;
create trigger orders_sync_board after insert or update on public.orders
  for each row execute function public.sync_order_board();

-- ─── Functions the app calls ─────────────────────────────────────────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members where user_id = (select auth.uid()))
$$;

-- Errors are raised with a short code as the message; the app turns them into words.
create or replace function public.place_order(
  p_id            uuid,
  p_table_id      integer,
  p_table_name    text,
  p_customer_name text,
  p_order_type    text,
  p_items         jsonb,
  p_notes         text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order       public.orders;
  v_items       jsonb;
  v_total       numeric(10, 2);
  v_unknown     integer;
  v_unavailable integer;
  v_too_many    integer;
  v_code        text := '';
  v_tries       integer := 0;
  v_day         date;
  v_number      integer;
  v_table_name  text;
begin
  -- The same id again is a retry of a request that already went through: hand back that order
  select * into v_order from public.orders where id = p_id;
  if found then return v_order; end if;

  if p_id is null then raise exception 'invalid_order_id'; end if;
  if p_order_type is null or p_order_type not in ('dineIn', 'takeaway') then raise exception 'invalid_order_type'; end if;
  -- Every order comes from a table's QR code; take-away orders keep the table they were placed at.
  -- The table must exist now, and its name comes from here, not from the phone.
  select label into v_table_name from public.restaurant_tables where id = p_table_id and active;
  if not found then raise exception 'invalid_table'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'too_many_items'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    -- CASE so the casts only run on values already known to be numbers
    where case
      when jsonb_typeof(e -> 'id') = 'number' and jsonb_typeof(e -> 'quantity') = 'number' then
        (e ->> 'id')::numeric <> trunc((e ->> 'id')::numeric)
        or (e ->> 'id')::numeric not between 1 and 2147483647
        or (e ->> 'quantity')::numeric <> trunc((e ->> 'quantity')::numeric)
        or (e ->> 'quantity')::numeric < 1
      else true
    end
  ) then
    raise exception 'invalid_items';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where (e ->> 'quantity')::numeric > 50) then
    raise exception 'too_many_items';
  end if;

  -- Spam brake: one table (or the shared no-table slot) can't flood the kitchen
  if (select count(*) from public.orders
      where table_id = p_table_id and created_at > now() - interval '10 minutes') >= 30
  or (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 300 then
    raise exception 'too_many_orders';
  end if;

  with wanted as (
    select (e ->> 'id')::integer as id, sum((e ->> 'quantity')::integer) as quantity, min(pos) as pos
    from jsonb_array_elements(p_items) with ordinality as t (e, pos)
    group by 1
  )
  select
    jsonb_agg(jsonb_build_object(
      'id', m.id, 'name', m.name, 'price', m.price, 'quantity', w.quantity,
      'category', m.category, 'addon', m.addon
    ) order by w.pos),
    coalesce(sum(m.price * w.quantity), 0),
    count(*) filter (where m.id is null),
    count(*) filter (where m.id is not null and not m.available),
    count(*) filter (where w.quantity > 50)
  into v_items, v_total, v_unknown, v_unavailable, v_too_many
  from wanted w left join public.menu_items m on m.id = w.id and m.active;

  if v_unknown > 0 then raise exception 'unknown_item'; end if;
  if v_unavailable > 0 then raise exception 'item_unavailable'; end if;
  if v_too_many > 0 then raise exception 'too_many_items'; end if;

  if p_order_type = 'takeaway' then
    loop
      -- No 0/O or 1/I, so the code reads cleanly off a screen
      select 'T-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
        into v_code from generate_series(1, 4);
      v_tries := v_tries + 1;
      exit when v_tries >= 20 or not exists (
        select 1 from public.orders
        where takeaway_code = v_code and status not in ('served', 'paid', 'cancelled')
      );
    end loop;
  end if;

  -- Today's next queue number. Last, after every check, so a refused order never uses one up
  -- (and if anything fails after this, the transaction rolls the counter back too).
  v_day := public.restaurant_day();
  insert into public.order_counters as c (day, last_number) values (v_day, 1)
  on conflict (day) do update set last_number = c.last_number + 1
  returning c.last_number into v_number;

  insert into public.orders (id, number, order_day, table_id, table_name, customer_name, items, total, order_type, takeaway_code, notes)
  values (
    p_id,
    v_number,
    v_day,
    p_table_id,
    v_table_name,
    left(btrim(coalesce(p_customer_name, '')), 60),
    v_items,
    v_total,
    p_order_type,
    v_code,
    nullif(left(btrim(coalesce(p_notes, '')), 500), '')
  )
  on conflict (id) do nothing
  returning * into v_order;

  if not found then select * into v_order from public.orders where id = p_id; end if;
  return v_order;
end $$;

-- A guest's phone keeps the ids of the orders it placed; the id is the key to the order.
create or replace function public.get_orders(p_ids uuid[]) returns setof public.orders
language sql stable security definer set search_path = '' as $$
  select * from public.orders where id = any (p_ids[1:50]) order by created_at desc
$$;

create or replace function public.cancel_order(p_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  update public.orders set status = 'cancelled', cancelled_at = now()
  where id = p_id and status in ('pending', 'confirmed')
  returning * into v_order;
  if not found then raise exception 'not_cancellable'; end if;
  return v_order;
end $$;

create or replace function public.set_order_status(p_id uuid, p_status text) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  update public.orders set
    status       = p_status,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    preparing_at = case when p_status = 'preparing' then now() else preparing_at end,
    ready_at     = case when p_status = 'ready'     then now() else ready_at end,
    served_at    = case when p_status = 'served'    then now() else served_at end,
    paid_at      = case when p_status = 'paid'      then now() else paid_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = p_id
  returning * into v_order;

  if not found then raise exception 'order_not_found'; end if;
  return v_order;
end $$;

-- ─── Menu editing (staff) ────────────────────────────────────────────────────
-- p_id null adds an item. Prices change for new orders only; placed orders keep theirs.
create or replace function public.save_menu_item(
  p_id          integer,
  p_name        text,
  p_price       numeric,
  p_category    text,
  p_description text default '',
  p_addon       boolean default false
) returns public.menu_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item     public.menu_items;
  v_name     text := btrim(coalesce(p_name, ''));
  v_category text := btrim(coalesce(p_category, ''));
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  if length(v_name) not between 1 and 60 then raise exception 'invalid_name'; end if;
  if length(v_category) not between 1 and 30 then raise exception 'invalid_category'; end if;
  if p_price is null or p_price < 0 or p_price > 100000 or p_price <> round(p_price, 2) then
    raise exception 'invalid_price';
  end if;

  if p_id is null then
    -- Covers two tablets adding an item at the same moment
    lock table public.menu_items in share row exclusive mode;
    insert into public.menu_items (id, name, price, category, description, addon)
    values ((select coalesce(max(id), 0) + 1 from public.menu_items), v_name, p_price, v_category,
            left(btrim(coalesce(p_description, '')), 200), coalesce(p_addon, false))
    returning * into v_item;
  else
    update public.menu_items set
      name = v_name, price = p_price, category = v_category,
      description = left(btrim(coalesce(p_description, '')), 200),
      addon = coalesce(p_addon, addon), updated_at = now()
    where id = p_id and active
    returning * into v_item;
    if not found then raise exception 'unknown_item'; end if;
  end if;
  return v_item;
end $$;

create or replace function public.set_menu_item_available(p_id integer, p_available boolean) returns public.menu_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.menu_items;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  update public.menu_items set available = coalesce(p_available, true), updated_at = now()
  where id = p_id and active
  returning * into v_item;
  if not found then raise exception 'unknown_item'; end if;
  return v_item;
end $$;

create or replace function public.remove_menu_item(p_id integer) returns public.menu_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.menu_items;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  update public.menu_items set active = false, updated_at = now()
  where id = p_id and active
  returning * into v_item;
  if not found then raise exception 'unknown_item'; end if;
  return v_item;
end $$;

-- ─── Tables (staff) ──────────────────────────────────────────────────────────
-- Tables 1..p_count are open for check-in; any above it are switched off. A table that still
-- has open orders can't be switched off: the error names it (table_in_use:<id>).
create or replace function public.set_table_count(p_count integer) returns setof public.restaurant_tables
language plpgsql security definer set search_path = '' as $$
declare
  v_busy integer;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  if p_count is null or p_count < 1 or p_count > 200 then raise exception 'invalid_table_count'; end if;

  select min(t.id) into v_busy
  from public.restaurant_tables t
  where t.active and t.id > p_count
    and exists (select 1 from public.orders o where o.table_id = t.id and o.status not in ('paid', 'cancelled'));
  if v_busy is not null then raise exception 'table_in_use:%', v_busy; end if;

  insert into public.restaurant_tables (id, label)
  select g, 'Table ' || g from generate_series(1, p_count) g
  on conflict (id) do update set active = true, updated_at = now()
  where not public.restaurant_tables.active;

  update public.restaurant_tables set active = false, updated_at = now()
  where id > p_count and active;

  return query select * from public.restaurant_tables order by id;
end $$;

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.menu_items    enable row level security;
alter table public.staff_members enable row level security;
alter table public.orders        enable row level security;
alter table public.order_board   enable row level security;
alter table public.order_counters enable row level security;
alter table public.restaurant_tables enable row level security;

drop policy if exists "tables are public" on public.restaurant_tables;
create policy "tables are public" on public.restaurant_tables
  for select to anon, authenticated using (true);

drop policy if exists "menu is public" on public.menu_items;
create policy "menu is public" on public.menu_items
  for select to anon, authenticated using (true);

drop policy if exists "staff see their own membership" on public.staff_members;
create policy "staff see their own membership" on public.staff_members
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "staff see every order" on public.orders;
create policy "staff see every order" on public.orders
  for select to authenticated using ((select public.is_staff()));

drop policy if exists "order board is public" on public.order_board;
create policy "order board is public" on public.order_board
  for select to anon, authenticated using (true);

-- Reads only, filtered by the policies above; direct writes are off for everyone.
-- Granted explicitly so this works on projects that don't expose new tables by default.
grant usage on schema public to anon, authenticated;
grant select on public.menu_items, public.order_board, public.restaurant_tables to anon, authenticated;
grant select on public.orders, public.staff_members to authenticated;
revoke insert, update, delete, truncate on
  public.menu_items, public.staff_members, public.orders, public.order_board, public.restaurant_tables
  from anon, authenticated;
revoke all on public.order_counters from anon, authenticated;

revoke execute on function public.sync_order_board() from public, anon, authenticated;
revoke execute on function public.restaurant_day() from public, anon, authenticated;
revoke execute on function public.is_staff() from public;
revoke execute on function public.place_order(uuid, integer, text, text, text, jsonb, text) from public;
revoke execute on function public.get_orders(uuid[]) from public;
revoke execute on function public.cancel_order(uuid) from public;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
revoke execute on function public.save_menu_item(integer, text, numeric, text, text, boolean) from public, anon;
revoke execute on function public.set_menu_item_available(integer, boolean) from public, anon;
revoke execute on function public.remove_menu_item(integer) from public, anon;
revoke execute on function public.set_table_count(integer) from public, anon;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.place_order(uuid, integer, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.get_orders(uuid[]) to anon, authenticated;
grant execute on function public.cancel_order(uuid) to anon, authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.save_menu_item(integer, text, numeric, text, text, boolean) to authenticated;
grant execute on function public.set_menu_item_available(integer, boolean) to authenticated;
grant execute on function public.remove_menu_item(integer) to authenticated;
grant execute on function public.set_table_count(integer) to authenticated;

-- ─── Live updates ────────────────────────────────────────────────────────────
-- Staff screens follow public.orders, guests follow public.order_board, everyone follows the menu
-- and the tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_tables') then
      alter publication supabase_realtime add table public.restaurant_tables;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items') then
      alter publication supabase_realtime add table public.menu_items;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_board') then
      alter publication supabase_realtime add table public.order_board;
    end if;
  end if;
end $$;
