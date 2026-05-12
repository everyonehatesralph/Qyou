import { Smartphone, ShoppingBag, Clock, ArrowRight, Shield, Coffee, MapPin, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrderContext'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  { icon: Smartphone,  title: 'Scan & Order',      desc: 'Scan the QR code at your table to start ordering instantly' },
  { icon: ShoppingBag, title: 'Browse & Customize', desc: 'Explore our full menu and add items with one tap' },
  { icon: Clock,       title: 'Track in Real Time', desc: 'Watch your order flow from cashier to kitchen to your table' },
]

const TABLES = [
  { id: 1, name: 'Window Seat' },
  { id: 2, name: 'Center Table' },
  { id: 3, name: 'Garden View' },
  { id: 4, name: 'Bar Seat A' },
  { id: 5, name: 'Bar Seat B' },
]

export default function Welcome() {
  const navigate = useNavigate()
  const { setTableSession } = useAuth()
  const { orders } = useOrders()
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [selectedTable, setSelectedTable]     = useState<number | null>(null)
  const [name, setName] = useState('')

  // Table is occupied if it has any non-paid order
  const occupiedTableIds = useMemo(
    () => new Set(orders.filter(o => o.status !== 'paid').map(o => o.tableId)),
    [orders]
  )

  const handleStartOrder = () => {
    if (!selectedTable || !name.trim()) return
    const table = TABLES.find(t => t.id === selectedTable)!
    setTableSession(selectedTable, table.name, name.trim())
    navigate('/menu')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Theme toggle — floating since no navbar on landing */}
      <ThemeToggle variant="floating" />

      {/* ── Full-screen Hero ─────────────────────────────── */}
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background photo */}
        <img
          src="/assets/bg1.jpg"
          alt="Cafe ambiance"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 60%' }}
        />

        {/* Multi-layer gradient overlay for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg,
                rgba(13,11,10,0.4) 0%,
                rgba(13,11,10,0.15) 30%,
                rgba(13,11,10,0.15) 50%,
                rgba(13,11,10,0.7) 75%,
                rgba(13,11,10,0.95) 100%
              )
            `,
          }}
        />

        {/* Subtle radial glow behind logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(200,134,10,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 sm:px-8 max-w-xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/assets/bean.png"
              alt="DeVerse Cafe"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 30px rgba(200,134,10,0.3))' }}
            />
          </div>

          {/* Title */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 tracking-tight leading-none"
            style={{ color: '#F0E6D3' }}
          >
            DeVerse{' '}
            <span
              style={{
                color: '#C8860A',
                textShadow: '0 0 40px rgba(200,134,10,0.3)',
              }}
            >
              Cafe
            </span>
          </h1>

          {/* Tagline */}
          <p
            className="text-base sm:text-lg mb-10 max-w-md mx-auto leading-relaxed"
            style={{ color: 'rgba(240,230,211,0.7)' }}
          >
            Order from your table. Track in real time.
            <br />
            <span style={{ color: 'rgba(240,230,211,0.5)' }}>No waiting in line.</span>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setShowTablePicker(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-4 px-10 text-base rounded-2xl font-bold transition-all duration-300 active:scale-[0.97]"
              style={{
                backgroundColor: '#C8860A',
                color: '#0D0B0A',
                boxShadow: '0 0 40px rgba(200,134,10,0.35), 0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <Coffee className="w-5 h-5" />
              Start Ordering
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/staff/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-4 px-8 text-sm rounded-2xl font-semibold transition-all duration-300 active:scale-[0.97]"
              style={{
                backgroundColor: 'rgba(240,230,211,0.08)',
                color: 'rgba(240,230,211,0.7)',
                border: '1px solid rgba(240,230,211,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Shield className="w-4 h-4" />
              Staff Access
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'rgba(240,230,211,0.35)' }}>
            How it works
          </span>
          <div className="w-5 h-8 rounded-full border-2 flex justify-center pt-1.5" style={{ borderColor: 'rgba(240,230,211,0.2)' }}>
            <div className="w-1 h-2 rounded-full" style={{ backgroundColor: 'rgba(200,134,10,0.6)' }} />
          </div>
        </div>
      </div>

      {/* ── How it works section ──────────────────────────── */}
      <div className="relative">
        {/* Top fade from hero */}
        <div
          className="absolute -top-20 left-0 right-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #0D0B0A)' }}
        />

        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
          <div className="text-center mb-12">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(200,134,10,0.1)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.2)' }}
            >
              How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-base">
              Order in <span style={{ color: '#C8860A' }}>3 simple steps</span>
            </h2>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
            {features.map(({ icon: Icon, title, desc }, idx) => (
              <div
                key={title}
                className="relative rounded-2xl p-6 text-center group transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: '#171210',
                  border: '1px solid #2E2318',
                }}
              >
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
                >
                  {idx + 1}
                </span>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:shadow-glow-sm"
                  style={{ backgroundColor: 'rgba(200,134,10,0.1)', border: '1px solid rgba(200,134,10,0.2)' }}
                >
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-text-base text-sm mb-2">{title}</h3>
                <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Staff access card */}
          <button
            onClick={() => navigate('/staff/login')}
            className="w-full rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.99] group hover:-translate-y-0.5"
            style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,134,10,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2E2318')}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(200,134,10,0.1)', border: '1px solid rgba(200,134,10,0.25)' }}
            >
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-text-base font-semibold text-sm">Staff Access</p>
              <p className="text-text-muted text-xs mt-0.5">Dashboard · Kitchen · Menu Management · QR Codes</p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/assets/bean.png" alt="" className="w-4 h-4 opacity-40" />
            <span className="text-text-faint text-xs">DeVerse Cafe</span>
          </div>
          <p className="text-text-faint text-[11px] opacity-60">
            Mobile ordering system · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Table Picker Modal ─────────────────────────────── */}
      {showTablePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#171210', border: '1px solid #2E2318', maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid #2E2318' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5" style={{ color: '#C8860A' }} />
                <h2 className="text-text-base font-bold text-lg">Where are you seated?</h2>
              </div>
              <p className="text-text-muted text-xs">Select your table to start ordering</p>
            </div>

            {/* Table grid */}
            <div className="px-5 py-4 space-y-2 overflow-y-auto" style={{ maxHeight: '40vh' }}>
              {TABLES.map(table => {
                const occupied = occupiedTableIds.has(table.id)
                return (
                  <button
                    key={table.id}
                    onClick={() => !occupied && setSelectedTable(table.id)}
                    disabled={occupied}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left disabled:cursor-not-allowed"
                    style={{
                      border: selectedTable === table.id ? '2px solid #C8860A'
                        : occupied ? '2px solid rgba(248,113,113,0.3)'
                        : '2px solid #2E2318',
                      backgroundColor: selectedTable === table.id ? 'rgba(200,134,10,0.1)'
                        : occupied ? 'rgba(248,113,113,0.05)'
                        : '#211A15',
                      opacity: occupied ? 0.55 : 1,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{
                        backgroundColor: selectedTable === table.id ? '#C8860A'
                          : occupied ? 'rgba(248,113,113,0.15)'
                          : 'rgba(200,134,10,0.12)',
                        color: selectedTable === table.id ? '#0D0B0A'
                          : occupied ? '#F87171'
                          : '#C8860A',
                      }}
                    >
                      {occupied ? <Lock className="w-4 h-4" /> : table.id}
                    </div>
                    <div className="flex-1">
                      <span
                        className="font-semibold text-sm block"
                        style={{ color: selectedTable === table.id ? '#F0E6D3' : occupied ? '#9B8B7A' : '#9B8B7A' }}
                      >
                        {table.name}
                      </span>
                      {occupied && (
                        <span className="text-[10px] font-bold" style={{ color: '#F87171' }}>OCCUPIED</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Name input */}
            {selectedTable && (
              <div className="px-5 pb-2">
                <label className="block text-text-muted text-xs font-medium mb-1.5">Your name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStartOrder()}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid #2E2318' }}>
              <button
                onClick={() => { setShowTablePicker(false); setSelectedTable(null); setName('') }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartOrder}
                disabled={!selectedTable || !name.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
              >
                Start Ordering →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
