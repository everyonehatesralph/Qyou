import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, Globe, Pencil, Printer, Wifi } from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'
import { useSidebar } from '../../context/SidebarContext'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import { Button, Card, Segmented, TextInput } from '../../components/ui'
import { RESTAURANT } from '../../config/restaurant'
import { PRODUCT } from '../../config/product'

// ─── PERMANENT QR SYSTEM ──────────────────────────────────────────────────────
// Two types of QR codes:
//   1. TABLE QR → URL to the ordering app: https://your-vercel.app/t/{tableId}
//   2. WIFI  QR → Auto-connects phone to café WiFi: WIFI:T:WPA;S:ssid;P:pass;;
// QR codes are always black on white so every phone camera can read them.
// ──────────────────────────────────────────────────────────────────────────────
const LS_KEY      = 'qyou_base_url'
const LS_WIFI_KEY = 'qyou_wifi'

interface WifiConfig {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
}

function detectNetworkUrl(): string {
  const { protocol, hostname, port } = window.location
  return `${protocol}//${hostname}${port ? ':' + port : ''}`
}

function getStoredUrl(): string {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored && stored.startsWith('http')) return stored
  } catch { /* noop */ }
  return detectNetworkUrl()
}

function getStoredWifi(): WifiConfig {
  try {
    const stored = localStorage.getItem(LS_WIFI_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* noop */ }
  return { ssid: '', password: '', encryption: 'WPA' }
}

function makeWifiQrString(wifi: WifiConfig): string {
  if (!wifi.ssid) return ''
  // Standard WiFi QR format — supported by Android & iOS camera apps
  const esc = (s: string) => s.replace(/[\\;,:""]/g, '\\$&')
  return `WIFI:T:${wifi.encryption};S:${esc(wifi.ssid)};P:${esc(wifi.password)};;`
}

/** Escapes text going into the print window's HTML. */
const html = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

// Print styles: black on white only
const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', system-ui, sans-serif; background: white; color: black; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); }
  .card { text-align: center; padding: 36px 24px; border: 1px dashed silver; break-inside: avoid; page-break-inside: avoid; }
  .single { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .single .card { border: none; max-width: 340px; }
  .name { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 500; }
  .table { font-size: 15px; margin-top: 4px; margin-bottom: 18px; }
  .qr { display: inline-block; padding: 12px; border: 2px solid black; border-radius: 12px; background: white; }
  .qr svg { display: block; }
  .scan { font-size: 15px; font-weight: 500; margin-top: 16px; }
  .tag { font-size: 11px; color: dimgray; margin-top: 6px; }
`
const PRINT_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Outfit:wght@400;500&display=swap" rel="stylesheet"/>'

function printCard(tableLabel: string, qrSvg: string): string {
  return `
    <div class="card">
      <p class="name">${html(RESTAURANT.name)}</p>
      <p class="table">${html(tableLabel)}</p>
      <div class="qr">${qrSvg}</div>
      <p class="scan">Scan to order</p>
      <p class="tag">${html(PRODUCT.tagline)}</p>
    </div>`
}

export default function QRCodeGenerator() {
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [baseUrl,  setBaseUrl]  = useState<string>(() => getStoredUrl())
  const [editUrl,  setEditUrl]  = useState<string>('')
  const [urlError, setUrlError] = useState<string>('')
  const [editing,  setEditing]  = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [copied,   setCopied]   = useState<number | null>(null)
  const [urlMode,  setUrlMode]  = useState<'vercel' | 'local'>(() => {
    const stored = getStoredUrl()
    return stored.includes('vercel.app') || stored.includes('.app') || stored.includes('.com')
      ? 'vercel'
      : 'local'
  })

  // WiFi config
  const [wifi,        setWifi]        = useState<WifiConfig>(() => getStoredWifi())
  const [editingWifi, setEditingWifi] = useState(false)
  const [wifiSaved,   setWifiSaved]   = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) { setEditUrl(getStoredUrl()); setEditing(true) }
    } catch { /* noop */ }
  }, [])

  const commitUrl = (url: string) => {
    localStorage.setItem(LS_KEY, url)
    setBaseUrl(url)
    setEditing(false)
    setUrlError('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const saveUrl = () => {
    let url = editUrl.trim().replace(/\/$/, '')
    if (!url) url = detectNetworkUrl()
    if (!url.startsWith('http')) url = 'http://' + url
    try { new URL(url) } catch {
      setUrlError('Enter a full address, e.g. https://qyou.vercel.app or http://192.168.1.10:5173')
      return
    }
    commitUrl(url)
  }

  const startEditUrl = () => {
    setEditUrl(baseUrl)
    setEditing(true)
  }

  const saveWifi = useCallback(() => {
    localStorage.setItem(LS_WIFI_KEY, JSON.stringify(wifi))
    setEditingWifi(false)
    setWifiSaved(true)
    setTimeout(() => setWifiSaved(false), 3000)
  }, [wifi])

  const qrUrl = useCallback((tableId: number) => `${baseUrl}/t/${tableId}`, [baseUrl])

  const copyUrl = useCallback((tableId: number) => {
    navigator.clipboard.writeText(qrUrl(tableId)).then(() => {
      setCopied(tableId)
      setTimeout(() => setCopied(null), 2000)
    })
  }, [qrUrl])

  const downloadQR = useCallback((tableId: number, tableName: string) => {
    const el  = document.getElementById(`qr-wrap-${tableId}`)
    const svg = el?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas  = document.createElement('canvas')
    const size    = 800
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `qyou-${tableName.toLowerCase().replace(/\s+/g, '-')}-qr.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const openPrint = (title: string, body: string, width: number, height: number) => {
    const win = window.open('', '_blank', `width=${width},height=${height}`)
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${html(title)}</title>${PRINT_FONTS}<style>${PRINT_CSS}</style></head><body>${body}</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  const printAllQR = () => {
    const cards = RESTAURANT.tables.map(table => {
      const el = document.getElementById(`qr-wrap-${table.id}`)
      return el ? printCard(table.label, el.innerHTML) : ''
    }).join('')
    openPrint(`${RESTAURANT.name} — table QR codes`, `<div class="grid">${cards}</div>`, 800, 600)
  }

  const printSingleQR = (tableId: number, tableName: string) => {
    const el = document.getElementById(`qr-wrap-${tableId}`)
    if (!el) return
    openPrint(`QR — ${tableName}`, `<div class="single">${printCard(tableName, el.innerHTML)}</div>`, 420, 620)
  }

  const wifiQrString = makeWifiQrString(wifi)

  return (
    <StaffPageShell>
      <StaffHeader
        title="QR codes"
        subtitle="Printable table cards"
        actions={!editing ? <Button variant="primary" leftIcon={<Printer />} onClick={printAllQR}>Print all</Button> : undefined}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Ordering link ── */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <Globe className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg text-ink">Ordering link</h2>
                <p className="mt-0.5 text-sm text-ink-muted">Where guests’ phones go after scanning a table code.</p>
              </div>
            </div>

            {editing ? (
              <div className="mt-4 space-y-3">
                <Segmented
                  label="Address type"
                  value={urlMode}
                  onChange={setUrlMode}
                  options={[
                    { value: 'vercel', label: 'Public URL', icon: <Globe /> },
                    { value: 'local', label: 'Local network', icon: <Wifi /> },
                  ]}
                />
                {urlMode === 'local' && (
                  <Button fullWidth leftIcon={<Wifi />} onClick={() => commitUrl(detectNetworkUrl())}>
                    Use this device: {detectNetworkUrl()}
                  </Button>
                )}
                <form onSubmit={e => { e.preventDefault(); saveUrl() }} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <TextInput
                    label="Address"
                    hideLabel
                    type="url"
                    placeholder={urlMode === 'vercel' ? 'https://qyou.vercel.app' : 'http://192.168.1.10:5173'}
                    value={editUrl}
                    onChange={e => { setEditUrl(e.target.value); setUrlError('') }}
                    error={urlError || undefined}
                    className="flex-1"
                  />
                  <Button type="submit" variant="primary">Save</Button>
                </form>
                <p className="text-[13px] text-ink-muted">
                  {urlMode === 'vercel'
                    ? 'Use your deployed address. Codes then work on any internet connection.'
                    : 'Use this computer’s address on your Wi-Fi. Phones must be on the same network.'}
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <code className="min-w-0 max-w-full truncate rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
                  {baseUrl}
                </code>
                <Button variant="ghost" leftIcon={<Pencil />} onClick={startEditUrl}>Change</Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-status-ready-text">
                    <Check className="h-4 w-4" aria-hidden /> Saved
                  </span>
                )}
              </div>
            )}
          </Card>

          {/* ── Wi-Fi QR ── */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <Wifi className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg text-ink">Wi-Fi code</h2>
                <p className="mt-0.5 text-sm text-ink-muted">Guests scan it to join your Wi-Fi. Print it for the wall or the counter.</p>
              </div>
            </div>

            {editingWifi || !wifi.ssid ? (
              <form onSubmit={e => { e.preventDefault(); if (wifi.ssid) saveWifi() }} className="mt-4 grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Network name"
                  placeholder="e.g. Cafe-Guest-WiFi"
                  value={wifi.ssid}
                  onChange={e => setWifi(w => ({ ...w, ssid: e.target.value }))}
                />
                <TextInput
                  label="Password"
                  placeholder="Wi-Fi password"
                  value={wifi.password}
                  onChange={e => setWifi(w => ({ ...w, password: e.target.value }))}
                />
                <Button type="submit" variant="primary" disabled={!wifi.ssid} className="sm:col-span-2 sm:justify-self-start">
                  Save Wi-Fi code
                </Button>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="rounded-control border border-line bg-surface p-2">
                  <QRCodeSVG value={wifiQrString} size={104} level="H" fgColor="black" bgColor="white" includeMargin title={`Wi-Fi QR code for ${wifi.ssid}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] text-ink">Network: <span className="font-medium">{wifi.ssid}</span></p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">Works with iPhone and Android cameras.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="ghost" leftIcon={<Pencil />} onClick={() => setEditingWifi(true)} className="-ml-3">Change</Button>
                    {wifiSaved && (
                      <span className="inline-flex items-center gap-1 text-sm text-status-ready-text">
                        <Check className="h-4 w-4" aria-hidden /> Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Table cards ── */}
        {!editing && (
          <section aria-labelledby="table-codes">
            <h2 id="table-codes" className="mb-3 font-display text-xl text-ink">Table cards</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RESTAURANT.tables.map(table => (
                <li key={table.id} className="flex flex-col rounded-card border border-line bg-surface">
                  {/* Preview of the printed card; always light like paper */}
                  <div data-theme="light" className="m-3 rounded-control border border-line bg-surface p-5 text-center text-ink">
                    <p className="font-display text-xl leading-tight">{RESTAURANT.name}</p>
                    <p className="mt-1 text-sm text-ink-muted">{table.label}</p>
                    <div id={`qr-wrap-${table.id}`} className="mx-auto mt-4 inline-block rounded-control bg-surface p-2">
                      <QRCodeSVG value={qrUrl(table.id)} size={168} level="H" includeMargin={false} fgColor="black" bgColor="white" title={`QR code for ${table.label}`} />
                    </div>
                    <p className="mt-3 text-[15px] font-medium">Scan to order</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{PRODUCT.tagline}</p>
                  </div>
                  <p className="truncate px-4 text-center text-xs text-ink-muted" title={qrUrl(table.id)}>{qrUrl(table.id)}</p>
                  <div className="mt-auto grid grid-cols-3 gap-2 p-3">
                    <Button leftIcon={<Printer />} onClick={() => printSingleQR(table.id, table.label)} className="px-2">Print</Button>
                    <Button leftIcon={<Download />} onClick={() => downloadQR(table.id, table.label)} className="px-2">PNG</Button>
                    <Button leftIcon={copied === table.id ? <Check /> : <Copy />} onClick={() => copyUrl(table.id)} className="px-2">
                      {copied === table.id ? 'Copied' : 'Link'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </StaffPageShell>
  )
}
