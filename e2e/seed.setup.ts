import { test as setup, expect } from '@playwright/test'
import { seedId } from './fixtures'

// Orders the screens need: every kitchen column, a late ticket, a take-away code,
// something awaiting payment and paid history for the sales page.
// Table 1 stays free so check-in tests can use it.
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
const item = (id: number, name: string, price: number, quantity: number) => ({ id, name, price, quantity })

export const SEED_ORDERS = [
  { id: seedId(1), number: 41, tableId: 6, tableName: 'Table 6', customerName: 'Ana', items: [item(2, 'Caramel Macchiato', 165, 2), item(7, 'Butter Croissant', 95, 1)], total: 425, status: 'pending', orderType: 'takeaway', takeawayCode: 'T-8KQ0', createdAt: ago(3), notes: 'Take Away | + Oat Milk Upgrade' },
  { id: seedId(2), number: 42, tableId: 2, tableName: 'Table 2', customerName: 'Jun', items: [item(4, 'Cold Brew', 155, 1), item(9, 'Avocado Toast', 195, 1)], total: 350, status: 'confirmed', orderType: 'dineIn', takeawayCode: '', createdAt: ago(4), confirmedAt: ago(3), notes: 'Dine In | Extra hot' },
  { id: seedId(3), number: 43, tableId: 7, tableName: 'Table 7', customerName: 'Lia', items: [item(3, 'Matcha Latte', 175, 2)], total: 350, status: 'preparing', orderType: 'dineIn', takeawayCode: '', createdAt: ago(14), confirmedAt: ago(12), preparingAt: ago(10) },
  { id: seedId(4), number: 44, tableId: 3, tableName: 'Table 3', customerName: 'Mico', items: [item(10, 'Club Sandwich', 225, 1)], total: 225, status: 'ready', orderType: 'dineIn', takeawayCode: '', createdAt: ago(9), confirmedAt: ago(8), preparingAt: ago(7), readyAt: ago(1) },
  { id: seedId(5), number: 45, tableId: 9, tableName: 'Table 9', customerName: 'Rosa', items: [item(1, 'Signature Espresso', 120, 2)], total: 240, status: 'served', orderType: 'dineIn', takeawayCode: '', createdAt: ago(40), servedAt: ago(20) },
  { id: seedId(6), number: 46, tableId: 8, tableName: 'Table 8', customerName: 'Paolo', items: [item(5, 'Chamomile Honey Tea', 110, 1)], total: 110, status: 'confirmed', orderType: 'dineIn', takeawayCode: '', createdAt: ago(23), confirmedAt: ago(21) },
  { id: seedId(7), number: 47, tableId: 4, tableName: 'Table 4', customerName: 'Bea', items: [item(2, 'Caramel Macchiato', 165, 1), item(8, 'Almond Danish', 115, 1)], total: 280, status: 'paid', orderType: 'dineIn', takeawayCode: '', createdAt: ago(90), servedAt: ago(70), paidAt: ago(60) },
]

setup('seed orders', async ({ request }) => {
  // The dev server's fixture endpoint stores orders as given (status, times, prices)
  // and puts the menu back to src/constants/menu.ts
  const res = await request.post('/api/dev/seed', { data: { orders: SEED_ORDERS, resetMenu: true } })
  expect(res.ok()).toBeTruthy()
})
