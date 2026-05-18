import { Coffee } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function CustomerHeader() {
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const { customerName, tableName } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: '#0D0B0A', borderBottom: '1px solid #2E2318' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo + Cafe Name */}
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center gap-3 group"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(200,134,10,0.15)', border: '1px solid rgba(200,134,10,0.3)' }}>
            <Coffee className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="text-lg font-bold text-text-base leading-tight">
              De<span style={{ color: '#C8860A' }}>Verse</span>
            </div>
            <div className="text-xs text-text-muted font-medium">Cafe</div>
          </div>
        </button>

        {/* Center: Table & Customer Info */}
        {customerName && (
          <div className="hidden sm:flex flex-col items-center gap-0">
            <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">Welcome</p>
            <p className="text-sm font-bold text-text-base">{customerName}</p>
            <p className="text-xs text-text-faint mt-0.5">{tableName}</p>
          </div>
        )}

        {/* Right: Cart + Theme */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cart')}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ backgroundColor: 'rgba(200,134,10,0.1)', border: '1px solid rgba(200,134,10,0.2)' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#C8860A' }}>
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            {cartCount > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F87171', color: 'white' }}>
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
          <ThemeToggle variant="nav" />
        </div>
      </div>
    </header>
  )
}
