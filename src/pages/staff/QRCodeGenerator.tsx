import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer, QrCode, Wifi, CheckCircle, Copy, RefreshCw, Globe } from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'

const TABLES = [
  { id: 1, name: 'Table 1' },
  { id: 2, name: 'Table 2' },
  { id: 3, name: 'Table 3' },
  { id: 4, name: 'Table 4' },
  { id: 5, name: 'Table 5' },
  { id: 6, name: 'Table 6' },
  { id: 7, name: 'Table 7' },
  { id: 8, name: 'Table 8' },
  { id: 9, name: 'Table 9' },
  { id: 10, name: 'Table 10' },
]

// ─── PERMANENT QR SYSTEM ──────────────────────────────────────────────────────
// Two types of QR codes:
//   1. TABLE QR → URL to the ordering app: https://your-vercel.app/t/{tableId}
//   2. WIFI  QR → Auto-connects phone to café WiFi: WIFI:T:WPA;S:ssid;P:pass;;
// ──────────────────────────────────────────────────────────────────────────────
const LS_KEY      = 'deverse_cafe_base_url'
const LS_WIFI_KEY = 'deverse_cafe_wifi'

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

export default function QRCodeGenerator() {
  const [baseUrl,  setBaseUrl]  = useState<string>(() => getStoredUrl())
  const [editUrl,  setEditUrl]  = useState<string>('')
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
  const [wifi,       setWifi]       = useState<WifiConfig>(() => getStoredWifi())
  const [editingWifi, setEditingWifi] = useState(false)
  const [wifiSaved,  setWifiSaved]  = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) setEditing(true)
    } catch { /* noop */ }
  }, [])

  const saveUrl = useCallback(() => {
    let url = editUrl.trim().replace(/\/$/, '')
    if (!url) url = detectNetworkUrl()
    if (!url.startsWith('http')) url = 'http://' + url
    try { new URL(url) } catch {
      alert('Please enter a valid URL, e.g. https://qyou.vercel.app or http://192.168.1.10:5173')
      return
    }
    localStorage.setItem(LS_KEY, url)
    setBaseUrl(url)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [editUrl])

  const useCurrentUrl = useCallback(() => {
    const url = detectNetworkUrl()
    localStorage.setItem(LS_KEY, url)
    setBaseUrl(url)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [])

  const resetUrl = useCallback(() => {
    setEditUrl(baseUrl)
    setEditing(true)
  }, [baseUrl])

  const saveWifi = useCallback(() => {
    localStorage.setItem(LS_WIFI_KEY, JSON.stringify(wifi))
    setEditingWifi(false)
    setWifiSaved(true)
    setTimeout(() => setWifiSaved(false), 3000)
  }, [wifi])

  const qrUrl = useCallback(
    (tableId: number) => `${baseUrl}/t/${tableId}`,
    [baseUrl]
  )

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
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `deverse-cafe-${tableName.toLowerCase().replace(/\s+/g, '-')}-qr.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const printAllQR = useCallback(() => {
    const cards = TABLES.map(table => {
      const el = document.getElementById(`qr-wrap-${table.id}`)
      if (!el) return ''
      return `
        <div class="card">
          <h1>DeVerse Cafe</h1>
          <h2>${table.name}</h2>
          <div class="qr">${el.innerHTML}</div>
          <p>Scan to order from your table</p>
          <p class="hint">Point your camera at the QR code</p>
        </div>
      `
    }).join('')

    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>DeVerse Cafe — All Table QR Codes</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:'Outfit',sans-serif; background:#fff; }
          .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:0; }
          .card { text-align:center; padding:40px 24px; border:1px dashed #ddd;
                  page-break-inside:avoid; break-inside:avoid; }
          h1 { font-size:20px; font-weight:700; color:#C8860A; margin-bottom:2px; }
          h2 { font-size:14px; font-weight:600; color:#333; margin-bottom:16px; }
          .qr { background:#fff; padding:8px; border-radius:8px;
                border:2px solid #f0e6d3; display:inline-block; }
          p { font-size:11px; color:#555; margin-top:12px; }
          .hint { font-size:9px; color:#aaa; margin-top:4px; }
          @media print {
            body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
            .grid { grid-template-columns:repeat(2,1fr); }
          }
        </style>
      </head><body>
        <div class="grid">${cards}</div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }, [])

  const printSingleQR = useCallback((tableId: number, tableName: string) => {
    const el = document.getElementById(`qr-wrap-${tableId}`)
    if (!el) return
    const win = window.open('', '_blank', 'width=420,height=620')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Table QR — ${tableName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:'Outfit',sans-serif; background:#fff; display:flex;
                 align-items:center; justify-content:center; min-height:100vh; }
          .card { text-align:center; padding:40px 28px; max-width:320px; }
          h1 { font-size:24px; font-weight:700; color:#C8860A; margin-bottom:4px; }
          h2 { font-size:16px; font-weight:600; color:#333; margin-bottom:24px; }
          .qr { background:#fff; padding:16px; border-radius:12px;
                border:2px solid #f0e6d3; display:inline-block; }
          p { font-size:12px; color:#555; margin-top:20px; }
          .hint { font-size:10px; color:#aaa; margin-top:8px; }
          @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
        </style>
      </head><body>
        <div class="card">
          <h1>DeVerse Cafe</h1>
          <h2>${tableName}</h2>
          <div class="qr">${el.innerHTML}</div>
          <p>Scan to order from your table</p>
          <p class="hint">Point your camera at the QR code</p>
        </div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }, [])

  const wifiQrString = makeWifiQrString(wifi)

  return (
    <div className="min-h-screen bg-background md:ml-56 pt-4 md:pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <QrCode className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Table QR Codes</h1>
        </div>
        <p className="text-text-muted text-sm mb-6">
          Fixed & permanent — print once, works forever.
        </p>

        {/* ── WiFi QR Config ─────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            backgroundColor: wifi.ssid && !editingWifi ? 'rgba(96,165,250,0.06)' : 'rgba(200,134,10,0.06)',
            border: `1px solid ${wifi.ssid && !editingWifi ? 'rgba(96,165,250,0.3)' : 'rgba(200,134,10,0.35)'}`,
          }}
        >
          <div className="flex items-start gap-3">
            <Wifi className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: wifi.ssid ? '#60A5FA' : '#C8860A' }} />
            <div className="flex-1 min-w-0">
              {editingWifi || !wifi.ssid ? (
                <>
                  <p className="text-text-base font-semibold text-sm mb-1">Café WiFi QR Code</p>
                  <p className="text-text-muted text-xs mb-4">
                    Customers scan this to auto-connect to your WiFi. Print it on a wall poster or next to the menu.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-text-muted text-xs font-medium mb-1 block">WiFi Name (SSID)</label>
                      <input
                        type="text"
                        placeholder="e.g. DeVerse-Cafe-WiFi"
                        value={wifi.ssid}
                        onChange={e => setWifi(w => ({ ...w, ssid: e.target.value }))}
                        className="w-full font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-text-muted text-xs font-medium mb-1 block">Password</label>
                      <input
                        type="text"
                        placeholder="WiFi password"
                        value={wifi.password}
                        onChange={e => setWifi(w => ({ ...w, password: e.target.value }))}
                        className="w-full font-mono text-sm"
                      />
                    </div>
                    <button
                      onClick={saveWifi}
                      disabled={!wifi.ssid}
                      className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold text-background disabled:opacity-40"
                    >
                      Save WiFi QR
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-base font-semibold text-sm mb-0.5">✓ WiFi QR Ready</p>
                    <p className="text-text-muted text-xs">
                      Network: <strong>{wifi.ssid}</strong> — Print this separately for wall display
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingWifi(true)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text-base"
                  >
                    <RefreshCw className="w-3 h-3" /> Change
                  </button>
                  {wifiSaved && <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>✓ Saved!</span>}
                </div>
              )}
            </div>
          </div>
          {/* WiFi QR preview */}
          {wifi.ssid && !editingWifi && wifiQrString && (
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="p-3 rounded-xl bg-white inline-block">
                <QRCodeSVG value={wifiQrString} size={120} level="H" fgColor="#0D0B0A" bgColor="#FFFFFF" />
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Customers scan this to connect to WiFi</p>
                <p className="text-text-faint text-[10px]">Works on iPhone & Android camera apps</p>
              </div>
            </div>
          )}
        </div>

        {/* ── URL Config ──────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-5 mb-8"
          style={{
            backgroundColor: editing ? 'rgba(200,134,10,0.06)' : 'rgba(74,222,128,0.06)',
            border: `1px solid ${editing ? 'rgba(200,134,10,0.35)' : 'rgba(74,222,128,0.3)'}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {editing
                ? <Globe className="w-5 h-5 text-primary" />
                : <CheckCircle className="w-5 h-5" style={{ color: '#4ADE80' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <>
                  <p className="text-text-base font-semibold text-sm mb-1">
                    Set Your App URL
                  </p>
                  <p className="text-text-muted text-xs mb-4 leading-relaxed">
                    This is the URL customers' phones will open after scanning the table QR.
                  </p>

                  {/* Mode toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setUrlMode('vercel')}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={urlMode === 'vercel'
                        ? { backgroundColor: '#C8860A', color: '#0D0B0A' }
                        : { backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }
                      }
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Vercel / Public URL
                    </button>
                    <button
                      onClick={() => setUrlMode('local')}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={urlMode === 'local'
                        ? { backgroundColor: '#C8860A', color: '#0D0B0A' }
                        : { backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }
                      }
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      Local Network IP
                    </button>
                  </div>

                  {urlMode === 'local' && (
                    <button
                      onClick={useCurrentUrl}
                      className="w-full mb-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      style={{ backgroundColor: '#4ADE80', color: '#0D0B0A' }}
                    >
                      <Wifi className="w-4 h-4" />
                      Use Current: {detectNetworkUrl()}
                    </button>
                  )}

                  <div className="flex gap-2 flex-col sm:flex-row">
                    <input
                      type="url"
                      placeholder={urlMode === 'vercel'
                        ? 'https://qyou.vercel.app'
                        : 'http://192.168.1.10:5173'
                      }
                      defaultValue={baseUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveUrl()}
                      className="flex-1 font-mono text-sm"
                      autoFocus
                    />
                    <button
                      onClick={saveUrl}
                      className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold text-background flex-shrink-0"
                    >
                      Save & Lock
                    </button>
                  </div>

                  <p className="text-text-faint text-[11px] mt-3 leading-relaxed">
                    {urlMode === 'vercel'
                      ? '💡 Use your Vercel deployment URL. QR codes will work on any internet connection.'
                      : '💡 Use your local IP. Phones must be on the same WiFi to access the app.'
                    }
                  </p>
                </>
              ) : (
                <>
                  <p className="text-text-base font-semibold text-sm mb-0.5">
                    ✓ QR Codes Locked & Permanent
                  </p>
                  <p className="text-text-muted text-xs mb-3">
                    All table QR codes point to this address.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <code
                      className="text-sm font-mono px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'var(--surface-2)', color: 'var(--primary)', border: '1px solid var(--border)' }}
                    >
                      {baseUrl}
                    </code>
                    <button
                      onClick={resetUrl}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-base transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Change
                    </button>
                    {saved && (
                      <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>
                        ✓ Saved!
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── QR Grid ── */}
        {!editing && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={printAllQR}
                className="btn-primary py-2.5 px-5 rounded-xl flex items-center gap-2 text-sm text-background font-semibold"
              >
                <Printer className="w-4 h-4" />
                Print All Tables
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {TABLES.map(table => (
                <div key={table.id} className="card p-6 flex flex-col items-center text-center">
                  <h2 className="text-text-base font-semibold mb-0.5">{table.name}</h2>
                  <p className="text-text-muted text-xs mb-5">Table {table.id}</p>
                  <div
                    id={`qr-wrap-${table.id}`}
                    className="p-5 rounded-xl mb-4"
                    style={{ backgroundColor: '#FFFFFF' }}
                  >
                    <QRCodeSVG
                      value={qrUrl(table.id)}
                      size={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#0D0B0A"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <p className="text-text-muted text-xs mb-1 font-medium">
                    Scan to order · Table {table.id}
                  </p>
                  <p className="text-text-faint text-[10px] mb-4">
                    {baseUrl}/t/{table.id}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => printSingleQR(table.id, table.name)}
                      className="flex-1 btn-primary py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm text-background"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => downloadQR(table.id, table.name)}
                      className="flex-1 btn-ghost py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" /> PNG
                    </button>
                  </div>
                  <button
                    onClick={() => copyUrl(table.id)}
                    className="mt-2 text-[11px] text-text-faint hover:text-text-muted transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === table.id ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
