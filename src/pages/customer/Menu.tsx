import { Plus, Search, SearchX, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useCart } from '../../context/CartContext'
import { useMenuAvailability } from '../../context/MenuAvailabilityContext'
import { MENU_ITEMS, CATEGORIES, type MenuItem } from '../../constants/menu'
import { RESTAURANT } from '../../config/restaurant'
import { Button, Chip, EmptyState, IconButton, LetterTile, QuantityStepper, TextInput, buttonClasses, cn } from '../../components/ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

export default function Menu() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { addToCart, updateQuantity, cartItems, cartCount, cartTotal } = useCart()
  const { itemAvailability } = useMenuAvailability()
  const [category, setCategory] = useState<string>('All')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // /search redirects here with ?search=1: focus the field
  useEffect(() => {
    if (params.get('search') === '1') searchRef.current?.focus()
  }, [params])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => MENU_ITEMS.filter(item => {
    const inCategory = category === 'All' || item.category === category
    const matches = !q
      || item.name.toLowerCase().includes(q)
      || item.description.toLowerCase().includes(q)
      || item.category.toLowerCase().includes(q)
    return inCategory && matches
  }), [category, q])

  // Group by category when browsing everything; a flat list while searching
  const groups = useMemo(() => {
    if (q || category !== 'All') return [{ title: q ? '' : category, items: results }]
    return CATEGORIES.filter(c => c !== 'All')
      .map(c => ({ title: c as string, items: results.filter(i => i.category === c) }))
      .filter(g => g.items.length > 0)
  }, [results, q, category])

  const getQty = useCallback(
    (id: number) => cartItems.find(ci => ci.id === id)?.quantity ?? 0,
    [cartItems],
  )

  const setQty = (item: MenuItem, next: number) => {
    const qty = getQty(item.id)
    if (next > qty) addToCart(item)
    else if (next < qty) updateQuantity(item.id, -1)
  }

  const clearFilters = () => { setQuery(''); setCategory('All') }

  return (
    <div className={cn('min-h-screen bg-bg', cartCount > 0 ? 'pb-44' : 'pb-28')}>
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <TextInput
          ref={searchRef}
          label="Search the menu"
          hideLabel
          inputMode="search"
          placeholder="Search the menu"
          value={query}
          onChange={e => setQuery(e.target.value)}
          leftIcon={<Search />}
          rightSlot={query ? (
            <IconButton label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus() }}>
              <X />
            </IconButton>
          ) : undefined}
          enterKeyHint="search"
        />
      </div>

      {/* Category chips stay under the header while scrolling */}
      <div className="sticky top-16 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 scrollbar-hide" role="toolbar" aria-label="Categories">
          {CATEGORIES.map(c => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {q && (
          <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”
          </p>
        )}

        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches"
            body="Try another word, or look through all categories."
            action={<Button onClick={clearFilters}>Show the whole menu</Button>}
          />
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <section key={group.title || 'results'} aria-label={group.title || 'Search results'}>
                {group.title && <h2 className="mb-2 font-display text-xl text-ink">{group.title}</h2>}
                <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                  {group.items.map(item => {
                    const qty = getQty(item.id)
                    const available = item.available && itemAvailability[item.id] !== false
                    return (
                      <li key={item.id} className={cn('flex items-center gap-3 px-4 py-3', !available && 'bg-surface-2')}>
                        <LetterTile text={item.name} size="sm" className={cn('sm:h-12 sm:w-12 sm:text-xl', !available && 'opacity-60')} />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[15px] font-medium leading-snug', available ? 'text-ink' : 'text-ink-muted')}>
                            {item.name}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{item.description}</p>
                          <p className={cn('mt-1 text-[15px] tabular-nums', available ? 'font-medium text-ink' : 'text-ink-muted')}>
                            {available ? peso(item.price) : 'Sold out today'}
                          </p>
                        </div>
                        {available && (qty === 0 ? (
                          <IconButton
                            label={`Add ${item.name}`}
                            variant="outline"
                            onClick={() => addToCart(item)}
                            className="rounded-full border-line-strong text-ink"
                          >
                            <Plus />
                          </IconButton>
                        ) : (
                          <QuantityStepper value={qty} onChange={next => setQty(item, next)} itemName={item.name} />
                        ))}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-muted">
          Ordering by <span className="font-display text-sm text-ink">Qyou</span>
        </p>
      </main>

      {/* Cart bar, above the bottom navigation */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true }, 'mx-auto flex max-w-3xl justify-between shadow-pop')}
          >
            <span>View cart · {cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            <span className="tabular-nums">{peso(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
