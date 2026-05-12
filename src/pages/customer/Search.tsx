import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ShoppingCart, Plus, Minus, Coffee, Leaf, Croissant, Utensils } from 'lucide-react'
import { MENU_ITEMS, CATEGORIES } from '../../constants/menu'
import { useCart } from '../../context/CartContext'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Coffee:  Coffee,
  Tea:     Leaf,
  Pastry:  Croissant,
  Food:    Utensils,
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { cartItems, addToCart, updateQuantity } = useCart()
  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState<string>('All')

  const getQty = useCallback(
    (id: number) => cartItems.find(i => i.id === id)?.quantity ?? 0,
    [cartItems]
  )

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    return MENU_ITEMS.filter(item => {
      const matchCat  = category === 'All' || item.category === category
      const matchText = !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      return matchCat && matchText
    })
  }, [query, category])

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D0B0A', paddingBottom: '90px' }}>
      {/* Header */}
      <div
        className="sticky top-14 z-30 px-4 pt-4 pb-3"
        style={{ backgroundColor: '#0D0B0A', borderBottom: '1px solid #2E2318' }}
      >
        {/* Search input */}
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#9B8B7A' }}
          />
          <input
            autoFocus
            type="text"
            placeholder="Search menu items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: '#171210',
              border: '1px solid #2E2318',
              color: '#F0E6D3',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9B8B7A' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat]
            const active = category === cat
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={active
                  ? { backgroundColor: '#C8860A', color: '#0D0B0A' }
                  : { backgroundColor: '#171210', color: '#9B8B7A', border: '1px solid #2E2318' }
                }
              >
                {Icon && <Icon className="w-3 h-3" />}
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-4">
        {/* Result count */}
        <p className="text-xs mb-4" style={{ color: '#9B8B7A' }}>
          {query || category !== 'All'
            ? `${results.length} result${results.length !== 1 ? 's' : ''} found`
            : `${MENU_ITEMS.length} items on the menu`}
        </p>

        {results.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
            >
              <Search className="w-7 h-7" style={{ color: '#C8860A' }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: '#F0E6D3' }}>Nothing found</p>
            <p className="text-sm" style={{ color: '#9B8B7A' }}>
              Try a different keyword or category
            </p>
            <button
              onClick={() => { setQuery(''); setCategory('All') }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(item => {
              const qty = getQty(item.id)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: '#171210',
                    border: '1px solid #2E2318',
                    opacity: item.available ? 1 : 0.5,
                  }}
                >
                  {/* Category dot */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(200,134,10,0.12)', border: '1px solid rgba(200,134,10,0.2)' }}
                  >
                    {(() => {
                      const Icon = CATEGORY_ICONS[item.category]
                      return Icon
                        ? <Icon className="w-5 h-5" style={{ color: '#C8860A' }} />
                        : <Coffee className="w-5 h-5" style={{ color: '#C8860A' }} />
                    })()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate" style={{ color: '#F0E6D3' }}>{item.name}</p>
                      {!item.available && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#F87171' }}
                        >
                          Sold Out
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#9B8B7A' }}>{item.description}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: '#C8860A' }}>₱{item.price}</p>
                  </div>

                  {/* Add/remove controls */}
                  {item.available ? (
                    qty === 0 ? (
                      <button
                        onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, category: item.category, description: item.description })}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: '#171210', border: '1px solid #2E2318', color: '#F0E6D3' }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-4 text-center" style={{ color: '#C8860A' }}>{qty}</span>
                        <button
                          onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, category: item.category, description: item.description })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => navigate('/cart')}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shadow-lg transition-all z-40"
          style={{ backgroundColor: '#C8860A', color: '#0D0B0A', boxShadow: '0 4px 20px rgba(200,134,10,0.4)' }}
        >
          <ShoppingCart className="w-4 h-4" />
          View Cart ({cartCount})
        </button>
      )}
    </div>
  )
}
