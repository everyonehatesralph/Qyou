import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The suite seeds orders through the order API, which writes server/orders.json.
// Keep a copy and put it back afterwards so test runs never change the tracked file.
const ORDERS = fileURLToPath(new URL('../server/orders.json', import.meta.url))

export default function globalSetup() {
  const original = readFileSync(ORDERS, 'utf8')
  return () => writeFileSync(ORDERS, original)
}
