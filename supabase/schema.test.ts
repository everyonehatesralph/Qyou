import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { SEED_MENU } from '../src/constants/menu.ts'

// Runs the Supabase migration on an in-process Postgres with the few Supabase pieces it
// relies on (auth.users, auth.uid(), the anon/authenticated roles, the realtime publication)
// stubbed, then checks pricing and who may do what.
const MIGRATION = readFileSync(new URL('./migrations/20261104000000_shared_orders.sql', import.meta.url), 'utf8')

const STAFF = '11111111-1111-4111-8111-111111111111'
const STRANGER = '22222222-2222-4222-8222-222222222222'
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let db: PGlite

/** A Postgres with the Supabase pieces the migration needs, and the migration applied. */
async function supabaseLikeDb({ defaultGrants, before = '' }: { defaultGrants: boolean; before?: string }) {
  const pg = new PGlite()
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create publication supabase_realtime;
  `)
  // Supabase's usual default: API roles get every privilege on new tables, which the
  // migration has to take back. Some newer projects skip it, so reads must not rely on it.
  if (defaultGrants) await pg.exec('alter default privileges in schema public grant all on tables to anon, authenticated')
  if (before) await pg.exec(before)
  await pg.exec(MIGRATION)
  await pg.exec(`
    insert into auth.users (id, email) values ('${STAFF}', 'staff@example.com'), ('${STRANGER}', 'someone@example.com');
    insert into public.staff_members (user_id) values ('${STAFF}');
  `)
  return pg
}

before(async () => {
  db = await supabaseLikeDb({ defaultGrants: true })
  // Running it twice must work (setup docs say it is safe to re-run)
  await db.exec(MIGRATION)
})

/** Runs SQL as a Supabase API caller: a guest (anon key) or a signed-in user. */
async function as<T = Record<string, unknown>>(who: 'anon' | string, sql: string, params: unknown[] = [], on: PGlite = db) {
  const role = who === 'anon' ? 'anon' : 'authenticated'
  const sub = who === 'anon' ? '' : who
  return on.transaction(async tx => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub])
    await tx.exec(`set local role ${role}`)
    return (await tx.query<T>(sql, params)).rows
  })
}

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (e: Error) => e.message.includes(code))
}

const place = (who: string, id: string, items: unknown, opts: { table?: number; type?: string; name?: string } = {}) =>
  as<{ id: string; number: number; order_day: Date; total: string; items: { id: number; name: string; price: number; quantity: number; category: string; addon: boolean }[]; takeaway_code: string; board_id: string; status: string }>(
    who,
    `select * from public.place_order($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [id, opts.table ?? 4, `Table ${opts.table ?? 4}`, opts.name ?? 'Ana', opts.type ?? 'dineIn', JSON.stringify(items), 'Dine In'],
  ).then(rows => rows[0])

test('the seeded menu matches src/constants/menu.ts', async () => {
  const fresh = await supabaseLikeDb({ defaultGrants: true })
  const rows = (await fresh.query<{ id: number; name: string; price: string; category: string; description: string; addon: boolean }>(
    'select id, name, price, category, description, addon from public.menu_items order by id')).rows
  await fresh.close()
  assert.deepEqual(
    rows.map(r => ({ id: r.id, name: r.name, price: Number(r.price), category: r.category, description: r.description, addon: r.addon })),
    SEED_MENU.map(m => ({ id: m.id, name: m.name, price: m.price, category: m.category, description: m.description, addon: !!m.addon })),
  )
})

test('orders are priced by the server, not the browser', async () => {
  const order = await place('anon', uuid(1), [
    { id: 2, name: 'Caramel Macchiato', price: 1, quantity: 2 },
    { id: 7, price: 0, quantity: 1 },
    { id: 2, quantity: 1 },
  ])
  assert.equal(Number(order.total), 165 * 3 + 95)
  assert.deepEqual(order.items.map(i => [i.id, i.name, Number(i.price), i.quantity, i.category, i.addon]), [
    [2, 'Caramel Macchiato', 165, 3, 'Coffee', false],
    [7, 'Butter Croissant', 95, 1, 'Pastry', false],
  ])
  assert.equal(order.status, 'pending')
  assert.equal(order.takeaway_code, '')
})

test('sending the same order id again returns the first order instead of a second one', async () => {
  const first = await place('anon', uuid(2), [{ id: 1, quantity: 1 }])
  const again = await place('anon', uuid(2), [{ id: 10, quantity: 5 }])
  assert.equal(again.id, first.id)
  assert.equal(Number(again.total), 120)
  const [{ count }] = (await db.query<{ count: number }>('select count(*)::int as count from public.orders where id = $1', [uuid(2)])).rows
  assert.equal(count, 1)
})

test('bad carts are refused', async () => {
  await rejects(place('anon', uuid(3), []), 'empty_order')
  await rejects(place('anon', uuid(3), [{ id: 999, quantity: 1 }]), 'unknown_item')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 0 }]), 'invalid_items')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 1.5 }]), 'invalid_items')
  await rejects(place('anon', uuid(3), [{ id: 'abc', quantity: 1 }]), 'invalid_items')
  await rejects(place('anon', uuid(3), [{ id: 1 }]), 'invalid_items')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 51 }]), 'too_many_items')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 30 }, { id: 1, quantity: 30 }]), 'too_many_items')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 1 }], { type: 'delivery' }), 'invalid_order_type')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 1 }], { table: -1 }), 'invalid_table')
  await rejects(place('anon', uuid(3), [{ id: 1, quantity: 1 }], { table: 0 }), 'invalid_table')

  await db.query('update public.menu_items set available = false where id = 6')
  await rejects(place('anon', uuid(3), [{ id: 6, quantity: 1 }]), 'item_unavailable')
  await db.query('update public.menu_items set available = true where id = 6')
})

test('add-ons are charged like menu items', async () => {
  const order = await place('anon', uuid(5), [{ id: 2, quantity: 1 }, { id: 102, quantity: 1 }, { id: 103, quantity: 1 }])
  assert.equal(Number(order.total), 165 + 25 + 0)
  assert.deepEqual(order.items.map(i => [i.name, i.category, i.addon]), [
    ['Caramel Macchiato', 'Coffee', false],
    ['Oat Milk Upgrade', 'Add-ons', true],
    ['Extra Sugar', 'Add-ons', true],
  ])
})

test('take-away orders get a pickup code', async () => {
  const order = await place('anon', uuid(4), [{ id: 4, quantity: 1 }], { type: 'takeaway', name: 'Jun' })
  assert.match(order.takeaway_code, /^T-[A-HJ-NP-Z2-9]{4}$/)
})

test('guests cannot read or write the orders table directly', async () => {
  assert.deepEqual(await as('anon', 'select * from public.orders'), [])
  assert.deepEqual(await as(STRANGER, 'select * from public.orders'), [])
  await rejects(as('anon', `insert into public.orders (id, table_id, table_name, items, total, order_type)
    values ('${uuid(90)}', 1, 'Table 1', '[]', 0, 'dineIn')`), 'permission denied')
  await rejects(as('anon', `update public.orders set total = 0`), 'permission denied')
  await rejects(as('anon', `delete from public.order_board`), 'permission denied')
  await rejects(as('anon', `update public.menu_items set price = 1`), 'permission denied')
})

test('a guest reads its own orders by id', async () => {
  const rows = await as<{ id: string }>('anon', 'select id from public.get_orders($1::uuid[])', [[uuid(1), uuid(4), uuid(77)]])
  assert.deepEqual(rows.map(r => r.id).sort(), [uuid(1), uuid(4)])
})

test('the public board has no items, prices, notes or dine-in names', async () => {
  const rows = await as<Record<string, unknown>>('anon', 'select * from public.order_board')
  assert.ok(rows.length >= 3)
  for (const row of rows) {
    for (const hidden of ['items', 'total', 'notes', 'id']) assert.ok(!(hidden in row), `board exposes ${hidden}`)
  }
  const dineIn = rows.find(r => r.order_type === 'dineIn')!
  assert.equal(dineIn.customer_name, '')
  const takeaway = rows.find(r => r.order_type === 'takeaway')!
  assert.equal(takeaway.customer_name, 'Jun')
})

test('only staff can change an order status', async () => {
  await rejects(as('anon', `select public.set_order_status($1, 'confirmed')`, [uuid(1)]), 'permission denied')
  await rejects(as(STRANGER, `select public.set_order_status($1, 'confirmed')`, [uuid(1)]), 'staff_only')

  const [order] = await as<{ status: string; confirmed_at: string | null }>(STAFF, `select * from public.set_order_status($1, 'confirmed')`, [uuid(1)])
  assert.equal(order.status, 'confirmed')
  assert.ok(order.confirmed_at)
  await rejects(as(STAFF, `select public.set_order_status($1, 'eaten')`, [uuid(1)]), 'invalid_status')
  await rejects(as(STAFF, `select public.set_order_status($1, 'ready')`, [uuid(99)]), 'order_not_found')

  // The board follows along, which is how guests' phones hear about it
  const [board] = await as<{ status: string }>('anon', `select b.status from public.order_board b
    where b.board_id = (select board_id from public.get_orders(array[$1::uuid]))`, [uuid(1)])
  assert.equal(board.status, 'confirmed')
})

test('staff see every order', async () => {
  const rows = await as<{ id: string }>(STAFF, 'select id from public.orders')
  assert.ok(rows.length >= 3)
})

test('a guest can cancel until the kitchen starts', async () => {
  const [cancelled] = await as<{ status: string; cancelled_at: string | null }>('anon', 'select * from public.cancel_order($1)', [uuid(1)])
  assert.equal(cancelled.status, 'cancelled')
  assert.ok(cancelled.cancelled_at)

  await as(STAFF, `select public.set_order_status($1, 'preparing')`, [uuid(4)])
  await rejects(as('anon', 'select public.cancel_order($1)', [uuid(4)]), 'not_cancellable')
})

test('only staff edit the menu, and the server charges the new price', async () => {
  const save = `select * from public.save_menu_item($1, $2, $3, $4, $5, $6)`
  await rejects(as('anon', save, [1, 'Espresso', 1, 'Coffee', '', false]), 'permission denied')
  await rejects(as(STRANGER, save, [1, 'Espresso', 1, 'Coffee', '', false]), 'staff_only')
  await rejects(as('anon', 'select public.set_menu_item_available(1, false)'), 'permission denied')
  await rejects(as(STRANGER, 'select public.remove_menu_item(1)'), 'staff_only')

  const [edited] = await as<{ price: string; name: string }>(STAFF, save, [1, 'Espresso', 130, 'Coffee', 'Double shot', false])
  assert.equal(Number(edited.price), 130)
  const order = await place('anon', uuid(20), [{ id: 1, quantity: 2 }])
  assert.equal(Number(order.total), 260)
  assert.equal(order.items[0].name, 'Espresso')

  await rejects(as(STAFF, save, [1, '  ', 130, 'Coffee', '', false]), 'invalid_name')
  await rejects(as(STAFF, save, [1, 'Espresso', -1, 'Coffee', '', false]), 'invalid_price')
  await rejects(as(STAFF, save, [1, 'Espresso', 1.005, 'Coffee', '', false]), 'invalid_price')

  // A new item gets the next free id
  const [added] = await as<{ id: number; addon: boolean }>(STAFF, save, [null, 'Ube Latte', 185, 'Coffee', '', false])
  assert.equal(added.id, 107)
  assert.equal(Number((await place('anon', uuid(21), [{ id: 107, quantity: 1 }])).total), 185)
})

test('sold-out and removed items cannot be ordered', async () => {
  await as(STAFF, 'select public.set_menu_item_available(9, false)')
  await rejects(place('anon', uuid(22), [{ id: 9, quantity: 1 }]), 'item_unavailable')
  await as(STAFF, 'select public.set_menu_item_available(9, true)')
  assert.equal(Number((await place('anon', uuid(22), [{ id: 9, quantity: 1 }])).total), 195)

  await as(STAFF, 'select public.remove_menu_item(8)')
  await rejects(place('anon', uuid(23), [{ id: 8, quantity: 1 }]), 'unknown_item')
  await rejects(as(STAFF, `select public.save_menu_item(8, 'Danish', 1, 'Pastry')`), 'unknown_item')
  // Old orders keep the removed item's name and price
  const [{ count }] = (await db.query<{ count: number }>(
    'select count(*)::int as count from public.menu_items where id = 8 and not active')).rows
  assert.equal(count, 1)
})

test('running the migration again keeps staff menu edits', async () => {
  await db.exec(MIGRATION)
  const [row] = (await db.query<{ name: string; price: string }>('select name, price from public.menu_items where id = 1')).rows
  assert.deepEqual([row.name, Number(row.price)], ['Espresso', 130])
})

test('queue numbers count up through the day and start at 1 the next day', async () => {
  const today = (await db.query<{ n: number }>(
    'select coalesce(max(number), 0)::int as n from public.orders where order_day = public.restaurant_day()')).rows[0].n
  const a = await place('anon', uuid(30), [{ id: 1, quantity: 1 }])
  const b = await place('anon', uuid(31), [{ id: 1, quantity: 1 }])
  assert.deepEqual([a.number, b.number], [today + 1, today + 2])

  // Replaying an order doesn't use up a number
  assert.equal((await place('anon', uuid(31), [{ id: 1, quantity: 1 }])).number, today + 2)
  // Neither does a refused one
  await rejects(place('anon', uuid(32), [{ id: 999, quantity: 1 }]), 'unknown_item')
  assert.equal((await place('anon', uuid(33), [{ id: 1, quantity: 1 }])).number, today + 3)

  // Tomorrow, in the restaurant's timezone
  await db.exec(`create or replace function public.restaurant_day() returns date language sql stable set search_path = ''
    as $$ select (now() at time zone 'Asia/Manila')::date + 1 $$`)
  const tomorrow = await place('anon', uuid(34), [{ id: 1, quantity: 1 }])
  assert.equal(tomorrow.number, 1)
  assert.equal(tomorrow.order_day.getTime() - a.order_day.getTime(), 86_400_000)
  await db.exec(MIGRATION) // puts restaurant_day back

  // A number repeats across days, never within one
  await rejects(db.query(
    `insert into public.orders (id, number, order_day, table_id, table_name, items, total, order_type)
     values ($1, $2, $3, 1, 'Table 1', '[]', 0, 'dineIn')`, [uuid(35), b.number, b.order_day]), 'duplicate key')
  // Guests can't see or move the counter
  await rejects(as('anon', 'select * from public.order_counters'), 'permission denied')
})

test('staff set how many tables there are; tables with open orders stay', async () => {
  const tables = async () => (await as<{ id: number; label: string; active: boolean }>('anon',
    'select id, label, active from public.restaurant_tables order by id'))
  const active = async () => (await tables()).filter(t => t.active).map(t => t.id)
  assert.deepEqual(await active(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  await rejects(as('anon', 'select * from public.set_table_count(8)'), 'permission denied')
  await rejects(as(STRANGER, 'select * from public.set_table_count(8)'), 'staff_only')
  await rejects(as(STAFF, 'select * from public.set_table_count(0)'), 'invalid_table_count')
  await rejects(as(STAFF, 'select * from public.set_table_count(201)'), 'invalid_table_count')
  await rejects(as('anon', `update public.restaurant_tables set active = false`), 'permission denied')

  // Someone is still eating at table 9: it can't go yet, and the error says which table
  await place('anon', uuid(40), [{ id: 1, quantity: 1 }], { table: 9 })
  await rejects(as(STAFF, 'select * from public.set_table_count(8)'), 'table_in_use:9')
  await as(STAFF, `select public.set_order_status($1, 'paid')`, [uuid(40)])

  const rows = await as<{ id: number; active: boolean }>(STAFF, 'select * from public.set_table_count(8)')
  assert.deepEqual(rows.filter(r => r.active).map(r => r.id), [1, 2, 3, 4, 5, 6, 7, 8])
  // A switched-off table takes no orders
  await rejects(place('anon', uuid(41), [{ id: 1, quantity: 1 }], { table: 9 }), 'invalid_table')
  await rejects(place('anon', uuid(41), [{ id: 1, quantity: 1 }], { table: 99 }), 'invalid_table')

  // More tables: the old ones come back, new ones are added
  await as(STAFF, 'select * from public.set_table_count(12)')
  assert.deepEqual(await active(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.equal((await tables()).find(t => t.id === 12)!.label, 'Table 12')
  await as(STAFF, 'select * from public.set_table_count(10)')
})

test('the table name on an order comes from the server, not the phone', async () => {
  const [order] = await as<{ table_name: string }>('anon',
    `select * from public.place_order($1, 3, 'VIP Lounge', 'Ana', 'dineIn', '[{"id": 1, "quantity": 1}]'::jsonb)`, [uuid(42)])
  assert.equal(order.table_name, 'Table 3')
})

test('orders, the board, the menu and the tables are published for live updates', async () => {
  const rows = (await db.query<{ tablename: string }>(
    `select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename`)).rows
  assert.deepEqual(rows.map(r => r.tablename), ['menu_items', 'order_board', 'orders', 'restaurant_tables'])
})

test('works on a project that does not expose new tables by default', async () => {
  const bare = await supabaseLikeDb({ defaultGrants: false })
  await as('anon', `select * from public.place_order($1, 2, 'Table 2', 'Ana', 'dineIn', '[{"id": 1, "quantity": 1}]'::jsonb)`, [uuid(500)], bare)
  assert.equal((await as('anon', 'select * from public.order_board', [], bare)).length, 1)
  assert.equal((await as('anon', 'select * from public.menu_items', [], bare)).length, SEED_MENU.length)
  assert.equal((await as(STAFF, 'select * from public.orders', [], bare)).length, 1)
  // No grant at all here, so it is refused outright rather than filtered to nothing
  await rejects(as('anon', 'select * from public.orders', [], bare), 'permission denied')
  await bare.close()
})

test('upgrading from numbers that never reset keeps old numbers and carries on after them', async () => {
  // public.orders as the first version of this migration made it: one ever-growing number
  const old = await supabaseLikeDb({
    defaultGrants: true,
    before: `
      create table public.orders (
        id uuid primary key, board_id uuid not null unique default gen_random_uuid(),
        number bigint generated always as identity unique,
        table_id integer not null, table_name text not null, customer_name text not null default '',
        items jsonb not null, total numeric(10, 2) not null, status text not null default 'pending',
        order_type text not null, takeaway_code text not null default '', notes text,
        created_at timestamptz not null default now(),
        confirmed_at timestamptz, preparing_at timestamptz, ready_at timestamptz,
        served_at timestamptz, paid_at timestamptz, cancelled_at timestamptz
      );
      insert into public.orders (id, table_id, table_name, items, total, order_type)
      values ('${uuid(600)}', 2, 'Table 2', '[]', 0, 'dineIn'), ('${uuid(601)}', 2, 'Table 2', '[]', 0, 'dineIn');`,
  })
  const before = (await old.query<{ number: number }>('select number::int from public.orders order by number')).rows
  assert.deepEqual(before.map(r => r.number), [1, 2])
  const [next] = await as<{ number: number }>('anon',
    `select number from public.place_order($1, 2, 'Table 2', 'Ana', 'dineIn', '[{"id": 1, "quantity": 1}]'::jsonb)`, [uuid(602)], old)
  assert.equal(Number(next.number), 3)
  await old.close()
})
