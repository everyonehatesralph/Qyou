import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The suite seeds orders and edits the menu, options and tables through the order API, which
// writes server/orders.json, menu.json, tables.json and options.json. Put them back afterwards so
// test runs never change a developer's data.
const FILES = ['../server/orders.json', '../server/menu.json', '../server/tables.json', '../server/options.json']
  .map(f => fileURLToPath(new URL(f, import.meta.url)))

export default function globalSetup() {
  const saved = FILES.map(file => (existsSync(file) ? readFileSync(file, 'utf8') : null))
  return () => FILES.forEach((file, i) => {
    const original = saved[i]
    if (original === null) rmSync(file, { force: true })
    else writeFileSync(file, original)
  })
}
