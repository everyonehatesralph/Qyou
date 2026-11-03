// Fails if any .tsx file contains a hex or rgb()/rgba() color literal.
// Colors belong in src/styles/globals.css (tokens) and src/config/restaurant.ts.
// Usage: node scripts/check-colors.mjs [paths...]   (default: src)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g
// Files allowed to contain literals. Must stay empty once the redesign is done.
const ALLOWLIST = []

const roots = process.argv.slice(2)
if (roots.length === 0) roots.push('src')

function collect(path, out) {
  const st = statSync(path)
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) collect(join(path, name), out)
  } else if (path.endsWith('.tsx')) {
    out.push(path)
  }
  return out
}

const files = roots.flatMap(r => collect(r, []))
const hits = []
for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, '/')
  if (ALLOWLIST.includes(rel)) continue
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(PATTERN)) hits.push(`${rel}:${i + 1}: ${m[0]}  ${line.trim().slice(0, 100)}`)
  })
}

if (hits.length) {
  console.log(hits.join('\n'))
  console.log(`\n${hits.length} color literal(s) in ${new Set(hits.map(h => h.split(':')[0])).size} file(s).`)
  process.exit(1)
}
console.log(`No color literals in ${files.length} .tsx file(s).`)
