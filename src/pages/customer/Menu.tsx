import { Coffee, Plus, Minus, ShoppingBag, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useCallback } from 'react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useMenuAvailability } from '../../context/MenuAvailabilityContext'
import { useOrders } from '../../context/OrderContext'
import { MENU_ITEMS, CATEGORIES } from '../../constants/menu'
import HelpAssistant from '../../components/HelpAssistant'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Menu() {
  const navigate = useNavigate()
  const { addToCart, updateQuantity, removeFromCart, cartItems, cartCount } = useCart()
  const { customerName } = useAuth()
  const { itemAvailability } = useMenuAvailability()
  const { orders } = useOrders()
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Queue number = total active orders (not yet served) + 1
  const queueNumber = useMemo(
    () => orders.filter(o => o.status !== 'served').length + 1,
    [orders]
  )

  const filteredItems = useMemo(() => {
    const byCat = selectedCategory === 'All'
      ? MENU_ITEMS
      : MENU_ITEMS.filter(i => i.category === selectedCategory)
    return byCat
  }, [selectedCategory])

  const getCartQty = useCallback(
    (id: number) => cartItems.find(ci => ci.id === id)?.quantity ?? 0,
    [cartItems]
  )
  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-36 md:pb-12">
        {/* Customer greeting */}
        {customerName && (
          <div
            className="rounded-xl p-4 mb-6 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(200,134,10,0.08)', border: '1px solid rgba(200,134,10,0.2)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(200,134,10,0.15)', border: '1px solid rgba(200,134,10,0.3)' }}
            >
              <span className="text-lg">☕</span>
            </div>
            <div>
              <p className="text-text-base font-semibold text-sm">
                {getGreeting()}, {customerName}!
              </p>
              <p className="text-text-muted text-xs mt-0.5">Ready to order? Browse our menu below.</p>
            </div>
          </div>
        )}

        {/* Queue number banner */}
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
          style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg"
            style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)' }}
          >
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Your estimated queue number</p>
            <p className="font-bold text-xl" style={{ color: '#60A5FA' }}>Q-{String(queueNumber).padStart(3, '0')}</p>
          </div>
          <p className="ml-auto text-xs text-text-faint text-right">Updates live</p>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Coffee className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Menu</h1>
          {cartCount > 0 && (
            <span className="ml-auto badge bg-primary text-background">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-primary text-background shadow-glow-sm'
                  : 'text-text-muted border border-border hover:border-border-light hover:text-text-base'
              }`}
              style={selectedCategory !== cat ? { backgroundColor: '#211A15' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const qty        = getCartQty(item.id)
            const available  = itemAvailability[item.id] !== false
            return (
              <div
                key={item.id}
                className={`card p-4 flex flex-col gap-3 relative ${!available ? 'opacity-60' : ''}`}
              >
                {/* Sold out badge */}
                {!available && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg z-10">
                    <span
                      className="badge text-sm px-4 py-1.5 rotate-[-15deg] shadow-lg"
                      style={{ backgroundColor: '#F87171', color: 'white', fontSize: '12px' }}
                    >
                      Sold Out
                    </span>
                  </div>
                )}
                {/* Category tag */}
                <span
                  className="badge self-start text-[11px]"
                  style={{ backgroundColor: 'rgba(232,201,122,0.1)', color: '#E8C97A', border: '1px solid rgba(232,201,122,0.2)' }}
                >
                  {item.category}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-base text-base leading-snug">{item.name}</h3>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">{item.description}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-lg" style={{ color: '#C8860A' }}>₱{item.price}</span>
                  {!available ? null : qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="btn-primary p-2 rounded-lg"
                    >
                      <Plus className="w-5 h-5" style={{ color: '#0D0B0A' }} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => qty === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ backgroundColor: '#2C231B', border: '1px solid #2E2318' }}
                      >
                        <Minus className="w-3.5 h-3.5 text-text-base" />
                      </button>
                      <span className="text-text-base font-semibold w-6 text-center">{qty}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow-sm transition-all"
                        style={{ backgroundColor: '#C8860A' }}
                      >
                        <Plus className="w-3.5 h-3.5" style={{ color: '#0D0B0A' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* Sticky cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 md:px-0 md:flex md:justify-center z-30">
          <button
            onClick={() => navigate('/cart')}
            className="w-full md:w-auto btn-primary flex items-center justify-between gap-4 py-4 px-6 rounded-2xl text-background"
            style={{ boxShadow: '0 0 32px rgba(200,134,10,0.3)' }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-semibold">View Cart</span>
            </div>
            <span
              className="rounded-lg px-3 py-1 text-sm font-bold"
              style={{ backgroundColor: 'rgba(13,11,10,0.25)' }}
            >
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
          </button>
        </div>

      )}
      {/* Floating help button */}
      <HelpAssistant />
    </div>
  )
}
