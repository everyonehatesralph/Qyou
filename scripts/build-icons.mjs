// Renders the Qyou icons into public/ from their SVG sources:
//   scripts/icons/app-icon.svg -> apple-touch-icon.png (180), icon-192.png, icon-512.png
//   public/favicon.svg         -> favicon.ico (16, 32, 48; light version, for browsers without SVG favicons)
// Uses the installed Chrome through Playwright, like the e2e suite. Run: npm run icons
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const path = p => fileURLToPath(new URL(`../${p}`, import.meta.url))

async function render(page, svgFile, size, { transparent }) {
  const svg = readFileSync(path(svgFile)).toString('base64')
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${svg}" width="${size}" height="${size}" style="display:block"></body>`,
  )
  await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0)
  return page.screenshot({ type: 'png', omitBackground: transparent })
}

/** An .ico holding PNG images, which every browser that still reads .ico supports. */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt8(0, entry + 2) // no palette
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4) // planes
    header.writeUInt16LE(32, entry + 6) // bits per pixel
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...pngs.map(p => p.data)])
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ deviceScaleFactor: 1 })
await page.emulateMedia({ colorScheme: 'light' })

for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(path(`public/${name}`), await render(page, 'scripts/icons/app-icon.svg', size, { transparent: false }))
  console.log(`public/${name}`)
}

const favicons = []
for (const size of [16, 32, 48]) {
  favicons.push({ size, data: await render(page, 'public/favicon.svg', size, { transparent: true }) })
}
writeFileSync(path('public/favicon.ico'), ico(favicons))
console.log('public/favicon.ico')

await browser.close()
