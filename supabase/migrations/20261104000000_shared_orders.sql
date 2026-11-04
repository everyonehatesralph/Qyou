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
-- Option groups guests choose from for this item (size, sugar…), in the order they're asked
alter table public.menu_items add column if not exists option_group_ids integer[] not null default '{}';

-- The starting menu: src/constants/menu.ts (a test checks they match). Only fills an empty
-- menu, so running this again never undoes staff edits.
insert into public.menu_items (id, name, price, category, description, addon, option_group_ids) values
  (1,   'Signature Espresso',  120, 'Coffee',  'Bold single-origin shot with rich crema',         false, '{}'),
  (2,   'Caramel Macchiato',   165, 'Coffee',  'Velvety milk layered with espresso & caramel',     false, '{1,2,3}'),
  (3,   'Matcha Latte',        175, 'Coffee',  'Ceremonial grade matcha with steamed oat milk',    false, '{1,2,3}'),
  (4,   'Cold Brew',           155, 'Coffee',  '18-hour steeped, smooth and naturally sweet',      false, '{1,3,4}'),
  (5,   'Chamomile Honey Tea', 110, 'Tea',     'Soothing floral with a touch of raw honey',        false, '{1,3}'),
  (6,   'Iced Lemon Verbena',  125, 'Tea',     'Refreshing citrus herb blend, served iced',        false, '{1,3,4}'),
  (7,   'Butter Croissant',    95,  'Pastry',  'Freshly baked with premium European butter',       false, '{}'),
  (8,   'Almond Danish',       115, 'Pastry',  'Flaky pastry with house-made almond cream',        false, '{}'),
  (9,   'Avocado Toast',       195, 'Food',    'Smashed avo on sourdough, cherry tomato, egg',     false, '{}'),
  (10,  'Club Sandwich',       225, 'Food',    'Triple-deck with chicken, bacon & house sauce',    false, '{}'),
  (101, 'Extra Espresso Shot', 30,  'Add-ons', '', true, '{}'),
  (102, 'Oat Milk Upgrade',    25,  'Add-ons', '', true, '{}'),
  (103, 'Extra Sugar',         0,   'Add-ons', '', true, '{}'),
  (104, 'Less Ice',            0,   'Add-ons', '', true, '{}'),
  (105, 'Whipped Cream',       20,  'Add-ons', '', true, '{}'),
  (106, 'Caramel Syrup',       15,  'Add-ons', '', true, '{}')
on conflict (id) do nothing;

-- ─── Item options: choices guests make per item (size, hot or iced, sugar…) ──
-- Groups are shared: one "Size" group can be on many drinks. A choice's price is added to the
-- item's price. Choice ids are unique across all groups (option_choice_id_seq for new ones).
create sequence if not exists public.option_choice_id_seq start with 100;
create table if not exists public.option_groups (
  id         integer primary key,
  name       text not null,
  required   boolean not null default true,   -- guests must pick one
  multiple   boolean not null default false,  -- guests may pick more than one
  choices    jsonb not null default '[]',     -- [{ id, name, price }] in display order
  active     boolean not null default true,   -- false = removed
  updated_at timestamptz not null default now()
);

-- The starting groups (OPTION_GROUPS in src/constants/menu.ts). Only fills an empty list.
insert into public.option_groups (id, name, required, multiple, choices)
select * from (values
  (1, 'Size', true, false, '[{"id":1,"name":"Regular","price":0},{"id":2,"name":"Large","price":30}]'::jsonb),
  (2, 'Hot or iced', true, false, '[{"id":3,"name":"Hot","price":0},{"id":4,"name":"Iced","price":0}]'::jsonb),
  (3, 'Sugar level', true, false, '[{"id":5,"name":"100% sugar","price":0},{"id":6,"name":"75% sugar","price":0},{"id":7,"name":"50% sugar","price":0},{"id":8,"name":"25% sugar","price":0},{"id":9,"name":"No sugar","price":0}]'::jsonb),
  (4, 'Ice level', true, false, '[{"id":10,"name":"Normal ice","price":0},{"id":11,"name":"Less ice","price":0},{"id":12,"name":"No ice","price":0}]'::jsonb)
) as seed (id, name, required, multiple, choices)
where not exists (select 1 from public.option_groups)
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
  v_items       jsonb := '[]';
  v_total       numeric(10, 2) := 0;
  v_line        record;
  v_item        public.menu_items;
  v_options     jsonb;
  v_extra       numeric(10, 2);
  v_found       integer;
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
  -- Options: a list of choice ids per line, each a whole number, none twice
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where e ? 'choices' and (
      jsonb_typeof(e -> 'choices') is distinct from 'array'
      or exists (
        select 1 from jsonb_array_elements(e -> 'choices') c
        where case when jsonb_typeof(c) = 'number' then (c #>> '{}')::numeric <> trunc((c #>> '{}')::numeric) else true end
      )
      or (select count(*) from jsonb_array_elements(e -> 'choices')) <> (select count(distinct c) from jsonb_array_elements(e -> 'choices') c)
    )
  ) then
    raise exception 'invalid_options';
  end if;

  -- Spam brake: one table (or the shared no-table slot) can't flood the kitchen
  if (select count(*) from public.orders
      where table_id = p_table_id and created_at > now() - interval '10 minutes') >= 30
  or (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 300 then
    raise exception 'too_many_orders';
  end if;

  -- One line per item and set of choices: the same drink twice with the same options is one
  -- line; with different options it stays two. Priced from the menu and option groups only.
  for v_line in
    with lines as (
      select (e ->> 'id')::integer as id, (e ->> 'quantity')::integer as quantity, pos,
             coalesce((select array_agg((c #>> '{}')::integer order by (c #>> '{}')::integer)
                       from jsonb_array_elements(e -> 'choices') c), '{}') as choices
      from jsonb_array_elements(p_items) with ordinality as t (e, pos)
    )
    select id, choices, sum(quantity)::integer as quantity, min(pos) as pos
    from lines group by id, choices order by min(pos)
  loop
    select * into v_item from public.menu_items where id = v_line.id and active;
    if not found then raise exception 'unknown_item'; end if;
    if not v_item.available then raise exception 'item_unavailable'; end if;
    if v_line.quantity > 50 then raise exception 'too_many_items'; end if;

    -- Every choice must come from a group this item asks for
    select coalesce(jsonb_agg(jsonb_build_object('group', g.name, 'choice', x.c ->> 'name', 'price', (x.c ->> 'price')::numeric)
                              order by array_position(v_item.option_group_ids, g.id), x.cpos), '[]'),
           coalesce(sum((x.c ->> 'price')::numeric), 0),
           count(*)
      into v_options, v_extra, v_found
    from public.option_groups g
    cross join lateral jsonb_array_elements(g.choices) with ordinality as x (c, cpos)
    where g.active and g.id = any (v_item.option_group_ids) and (x.c ->> 'id')::integer = any (v_line.choices);
    if v_found <> cardinality(v_line.choices) then raise exception 'invalid_options'; end if;

    -- One choice in a single-choice group; something chosen in every required one
    if exists (
      select 1 from public.option_groups g
      where g.active and g.id = any (v_item.option_group_ids) and not g.multiple
        and (select count(*) from jsonb_array_elements(g.choices) c where (c ->> 'id')::integer = any (v_line.choices)) > 1
    ) then raise exception 'invalid_options'; end if;
    if exists (
      select 1 from public.option_groups g
      where g.active and g.id = any (v_item.option_group_ids) and g.required
        and not exists (select 1 from jsonb_array_elements(g.choices) c where (c ->> 'id')::integer = any (v_line.choices))
    ) then raise exception 'missing_option'; end if;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_item.id, 'name', v_item.name, 'price', v_item.price + v_extra, 'quantity', v_line.quantity,
        'category', v_item.category, 'addon', v_item.addon
      ) || case when jsonb_array_length(v_options) > 0 then jsonb_build_object('options', v_options) else '{}' end
    );
    v_total := v_total + (v_item.price + v_extra) * v_line.quantity;
  end loop;

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
-- p_option_group_ids null keeps the item's option groups as they are.
drop function if exists public.save_menu_item(integer, text, numeric, text, text, boolean);
create or replace function public.save_menu_item(
  p_id               integer,
  p_name             text,
  p_price            numeric,
  p_category         text,
  p_description      text default '',
  p_addon            boolean default false,
  p_option_group_ids integer[] default null
) returns public.menu_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item     public.menu_items;
  v_name     text := btrim(coalesce(p_name, ''));
  v_category text := btrim(coalesce(p_category, ''));
  v_groups   integer[];
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  if length(v_name) not between 1 and 60 then raise exception 'invalid_name'; end if;
  -- Only groups that exist, each once, in the order given
  if p_option_group_ids is not null then
    select coalesce(array_agg(g order by pos), '{}') into v_groups
    from (select distinct on (g) g, pos from unnest(p_option_group_ids) with ordinality as u (g, pos) order by g, pos) d
    where exists (select 1 from public.option_groups o where o.id = d.g and o.active);
  end if;
  if length(v_category) not between 1 and 30 then raise exception 'invalid_category'; end if;
  if p_price is null or p_price < 0 or p_price > 100000 or p_price <> round(p_price, 2) then
    raise exception 'invalid_price';
  end if;

  if p_id is null then
    -- Covers two tablets adding an item at the same moment
    lock table public.menu_items in share row exclusive mode;
    insert into public.menu_items (id, name, price, category, description, addon, option_group_ids)
    values ((select coalesce(max(id), 0) + 1 from public.menu_items), v_name, p_price, v_category,
            left(btrim(coalesce(p_description, '')), 200), coalesce(p_addon, false), coalesce(v_groups, '{}'))
    returning * into v_item;
  else
    update public.menu_items set
      name = v_name, price = p_price, category = v_category,
      description = left(btrim(coalesce(p_description, '')), 200),
      addon = coalesce(p_addon, addon), option_group_ids = coalesce(v_groups, option_group_ids), updated_at = now()
    where id = p_id and active
    returning * into v_item;
    if not found then raise exception 'unknown_item'; end if;
  end if;
  return v_item;
end $$;

-- ─── Option groups (staff) ───────────────────────────────────────────────────
-- p_id null adds a group. p_choices: [{ id?, name, price }] in display order; a choice without
-- an id is new, a choice left out is gone. Placed orders keep the names and prices they had.
create or replace function public.save_option_group(
  p_id       integer,
  p_name     text,
  p_required boolean,
  p_multiple boolean,
  p_choices  jsonb
) returns public.option_groups
language plpgsql security definer set search_path = '' as $$
declare
  v_group   public.option_groups;
  v_name    text := btrim(coalesce(p_name, ''));
  v_known   integer[];
  v_choices jsonb;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  if length(v_name) not between 1 and 40 then raise exception 'invalid_name'; end if;
  if jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices) not between 1 and 20 then
    raise exception 'invalid_choices';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_choices) c
    where jsonb_typeof(c -> 'name') is distinct from 'string'
       or length(btrim(c ->> 'name')) not between 1 and 40
       or (c ? 'price' and jsonb_typeof(c -> 'price') is distinct from 'number')
       or (c ? 'price' and ((c ->> 'price')::numeric < 0 or (c ->> 'price')::numeric > 100000
                            or (c ->> 'price')::numeric <> round((c ->> 'price')::numeric, 2)))
       or (c ? 'id' and jsonb_typeof(c -> 'id') is distinct from 'number')
  ) then
    raise exception 'invalid_choices';
  end if;

  if p_id is not null then
    select * into v_group from public.option_groups where id = p_id and active for update;
    if not found then raise exception 'unknown_option_group'; end if;
    select coalesce(array_agg((c ->> 'id')::integer), '{}') into v_known from jsonb_array_elements(v_group.choices) c;
  else
    v_known := '{}';
  end if;
  -- A kept choice must already be in this group, so ids stay unique across groups
  if exists (select 1 from jsonb_array_elements(p_choices) c where c ? 'id' and not ((c ->> 'id')::integer = any (v_known))) then
    raise exception 'invalid_choices';
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', coalesce((c ->> 'id')::integer, nextval('public.option_choice_id_seq')::integer),
           'name', btrim(c ->> 'name'),
           'price', coalesce((c ->> 'price')::numeric, 0)
         ) order by pos)
    into v_choices
  from jsonb_array_elements(p_choices) with ordinality as t (c, pos);

  if p_id is null then
    lock table public.option_groups in share row exclusive mode;
    insert into public.option_groups (id, name, required, multiple, choices)
    values ((select coalesce(max(id), 0) + 1 from public.option_groups), v_name,
            coalesce(p_required, true), coalesce(p_multiple, false), v_choices)
    returning * into v_group;
  else
    update public.option_groups set
      name = v_name, required = coalesce(p_required, required), multiple = coalesce(p_multiple, multiple),
      choices = v_choices, updated_at = now()
    where id = p_id
    returning * into v_group;
  end if;
  return v_group;
end $$;

-- Switches a group off; items that use it stop asking for it.
create or replace function public.remove_option_group(p_id integer) returns public.option_groups
language plpgsql security definer set search_path = '' as $$
declare
  v_group public.option_groups;
begin
  if not public.is_staff() then raise exception 'staff_only' using errcode = '42501'; end if;
  update public.option_groups set active = false, updated_at = now()
  where id = p_id and active
  returning * into v_group;
  if not found then raise exception 'unknown_option_group'; end if;
  return v_group;
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
alter table public.option_groups enable row level security;

drop policy if exists "options are public" on public.option_groups;
create policy "options are public" on public.option_groups
  for select to anon, authenticated using (true);

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
grant select on public.menu_items, public.order_board, public.restaurant_tables, public.option_groups to anon, authenticated;
grant select on public.orders, public.staff_members to authenticated;
revoke insert, update, delete, truncate on
  public.menu_items, public.staff_members, public.orders, public.order_board, public.restaurant_tables,
  public.option_groups
  from anon, authenticated;
revoke all on sequence public.option_choice_id_seq from anon, authenticated;
revoke all on public.order_counters from anon, authenticated;

revoke execute on function public.sync_order_board() from public, anon, authenticated;
revoke execute on function public.restaurant_day() from public, anon, authenticated;
revoke execute on function public.is_staff() from public;
revoke execute on function public.place_order(uuid, integer, text, text, text, jsonb, text) from public;
revoke execute on function public.get_orders(uuid[]) from public;
revoke execute on function public.cancel_order(uuid) from public;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
revoke execute on function public.save_menu_item(integer, text, numeric, text, text, boolean, integer[]) from public, anon;
revoke execute on function public.save_option_group(integer, text, boolean, boolean, jsonb) from public, anon;
revoke execute on function public.remove_option_group(integer) from public, anon;
revoke execute on function public.set_menu_item_available(integer, boolean) from public, anon;
revoke execute on function public.remove_menu_item(integer) from public, anon;
revoke execute on function public.set_table_count(integer) from public, anon;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.place_order(uuid, integer, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.get_orders(uuid[]) to anon, authenticated;
grant execute on function public.cancel_order(uuid) to anon, authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.save_menu_item(integer, text, numeric, text, text, boolean, integer[]) to authenticated;
grant execute on function public.save_option_group(integer, text, boolean, boolean, jsonb) to authenticated;
grant execute on function public.remove_option_group(integer) to authenticated;
grant execute on function public.set_menu_item_available(integer, boolean) to authenticated;
grant execute on function public.remove_menu_item(integer) to authenticated;
grant execute on function public.set_table_count(integer) to authenticated;

-- ─── Live updates ────────────────────────────────────────────────────────────
-- Staff screens follow public.orders, guests follow public.order_board, everyone follows the menu,
-- its options and the tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'option_groups') then
      alter publication supabase_realtime add table public.option_groups;
    end if;
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
