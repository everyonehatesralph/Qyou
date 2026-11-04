import { Flame, Plus, Search, SearchX, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { useOrders } from '../../context/OrderContext'
import { useMenu } from '../../context/MenuContext'
import { CATEGORIES, type MenuItem } from '../../constants/menu'
import { RESTAURANT } from '../../config/restaurant'
import { flyToCart } from '../../components/CartFly'
import ItemPhoto from '../../components/ItemPhoto'
import MenuItemSheet from '../../components/MenuItemSheet'
import { Button, EmptyState, IconButton, QuantityStepper, TextInput, announce, buttonClasses, cn } from '../../components/ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

interface Section {
  id: string
  title: string
  subtitle?: string
  items: MenuItem[]
}

// Shown as Popular until there are enough orders to know what is
const HOUSE_PICKS = [2, 3, 7, 9]

/** The four items ordered most, or the house picks while there is too little to go on. From the live menu. */
function usePopular(items: MenuItem[]): Section {
  const { orders } = useOrders()
  return useMemo(() => {
    const counts = new Map<number, number>()
    for (const order of orders) {
      if (order.status === 'cancelled') continue
      for (const line of order.items) counts.set(line.id, (counts.get(line.id) ?? 0) + line.quantity)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    const fromOrders = ranked.length >= 4
    const ids = fromOrders ? ranked.slice(0, 4) : HOUSE_PICKS
    return {
      id: 'popular',
      title: 'Popular',
      subtitle: fromOrders ? 'Most ordered right now.' : 'Guest favourites.',
      items: ids.map(id => items.find(i => i.id === id)).filter((i): i is MenuItem => !!i),
    }
  }, [orders, items])
}

export default function Menu() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const reduce = useReducedMotion()
  const { addToCart, updateQuantity, cartItems, cartCount, cartTotal } = useCart()
  const { items, itemAvailability, groupsForItem } = useMenu()
  // Drinks with options (size, sugar…) open their sheet to choose instead of adding at once
  const hasOptions = (item: MenuItem) => groupsForItem(item).length > 0
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const popular = usePopular(items)

  // /search redirects here with ?search=1: focus the field
  useEffect(() => {
    if (params.get('search') === '1') searchRef.current?.focus()
  }, [params])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => !q ? [] : items.filter(item =>
    item.name.toLowerCase().includes(q)
    || item.description.toLowerCase().includes(q)
    || item.category.toLowerCase().includes(q),
  ), [q, items])

  const sections = useMemo<Section[]>(() => [
    popular,
    ...CATEGORIES.filter(c => c !== 'All').map(c => ({ id: c.toLowerCase(), title: c as string, items: items.filter(i => i.category === c) })),
  ].filter(s => s.items.length > 0), [popular, items])

  const getQty = useCallback(
    (id: number) => cartItems.filter(ci => ci.id === id).reduce((s, ci) => s + ci.quantity, 0),
    [cartItems],
  )
  const isAvailable = (item: MenuItem) => item.available && itemAvailability[item.id] !== false

  // ── Section tabs: tap to jump, and they follow the scroll ──
  const [active, setActive] = useState(sections[0]?.id)
  const navRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const quietUntil = useRef(0)

  useEffect(() => {
    if (q) return
    let frame = 0
    const update = () => {
      frame = 0
      // A tapped tab stays put while the page scrolls to it
      if (Date.now() < quietUntil.current) return
      const line = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 24
      let current = sections[0]?.id
      for (const s of sections) {
        const el = document.getElementById(`section-${s.id}`)
        if (el && el.getBoundingClientRect().top <= line) current = s.id
      }
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [sections, q])

  // Keep the current tab in view inside the strip
  useEffect(() => {
    const strip = stripRef.current
    const tab = strip?.querySelector<HTMLElement>(`[data-section="${active}"]`)
    if (!strip || !tab) return
    strip.scrollTo({ left: tab.offsetLeft - strip.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [active, reduce])

  const jump = (id: string) => {
    const section = document.getElementById(`section-${id}`)
    if (!section) return
    setActive(id)
    quietUntil.current = Date.now() + 900
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    // Keyboard and screen reader users continue from the section they jumped to
    section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }

  // ── Adding ──
  // The Add button and the stepper swap places; a keyboard user's focus follows.
  // Keyed by section too: an item can be both in Popular and in its own section.
  const handoff = useRef<{ key: string; to: 'add' | 'plus' } | null>(null)
  const takeFocus = (key: string, to: 'add' | 'plus') => (el: HTMLButtonElement | null) => {
    if (el && handoff.current?.key === key && handoff.current.to === to) {
      handoff.current = null
      el.focus()
    }
  }
  const itemsText = (n: number) => `${n} ${n === 1 ? 'item' : 'items'} in your cart`

  const add = (item: MenuItem, button: HTMLButtonElement, key?: string) => {
    if (key && document.activeElement === button) handoff.current = { key, to: 'plus' }
    addToCart(item)
    flyToCart(button)
    announce(`Added ${item.name}. ${itemsText(cartCount + 1)}.`)
  }

  const addWithOptions = (item: MenuItem, choices: number[], quantity: number, button: HTMLButtonElement) => {
    addToCart(item, choices, quantity)
    flyToCart(button)
    announce(`Added ${quantity} ${item.name}. ${itemsText(cartCount + quantity)}.`)
    setOpenId(null)
  }

  const setQty = (item: MenuItem, next: number, key?: string) => {
    const qty = getQty(item.id)
    if (next > qty) {
      addToCart(item)
      announce(`${item.name}: ${next}. ${itemsText(cartCount + 1)}.`)
    } else if (next < qty) {
      if (key && next === 0 && document.activeElement?.closest('[role=group]')) handoff.current = { key, to: 'add' }
      updateQuantity(item.id, -1)
      announce(next === 0 ? `Removed ${item.name}. ${itemsText(cartCount - 1)}.` : `${item.name}: ${next}. ${itemsText(cartCount - 1)}.`)
    }
  }

  const card = (item: MenuItem, sectionId: string, index: number) => {
    // With options, each set of choices is its own cart line: the card always offers +
    const qty = hasOptions(item) ? 0 : getQty(item.id)
    const available = isAvailable(item)
    const key = `${sectionId}-${item.id}`
    return (
      // Popular is one row of three from 640px, so the fourth waits for phones
      <li key={key} className={cn('relative', sectionId === 'popular' && index === 3 && 'sm:hidden')}>
        <button
          type="button"
          onClick={() => setOpenId(item.id)}
          aria-haspopup="dialog"
          className="group block w-full rounded-card text-left"
        >
          <ItemPhoto
            item={item}
            eager={index < 4 && sectionId === sections[0]?.id}
            dimmed={!available}
            className="aspect-square rounded-card border border-line transition-transform duration-200 group-active:scale-[0.98]"
          />
          <span className={cn('mt-2 block text-[15px] font-semibold leading-snug', available ? 'text-ink' : 'text-ink-muted')}>
            {item.name}
          </span>
          <span className={cn('mt-0.5 block text-[15px] tabular-nums', available ? 'text-ink' : 'text-ink-muted')}>
            {available ? peso(item.price) : 'Sold out today'}
          </span>
        </button>

        {/* Over the photo's bottom-right corner; a sibling of the card button, never inside it */}
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          {!available ? (
            <span className="absolute left-2 top-2 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-lift">
              Sold out
            </span>
          ) : (
            <div className="pointer-events-auto absolute bottom-2 right-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {qty === 0 ? (
                  <motion.div key="add" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.18 }}>
                    <IconButton
                      ref={takeFocus(key, 'add')}
                      label={`Add ${item.name}`}
                      variant="outline"
                      onClick={e => (hasOptions(item) ? setOpenId(item.id) : add(item, e.currentTarget, key))}
                      className="border-line bg-surface text-ink shadow-lift hover:bg-surface"
                    >
                      <Plus />
                    </IconButton>
                  </motion.div>
                ) : (
                  <motion.div key="stepper" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                    <QuantityStepper
                      value={qty}
                      onChange={next => setQty(item, next, key)}
                      itemName={item.name}
                      onIncrementFrom={flyToCart}
                      incrementRef={takeFocus(key, 'plus')}
                      className="shadow-lift"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </li>
    )
  }

  const grid = (items: MenuItem[], sectionId: string) => (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4">
      {items.map((item, i) => card(item, sectionId, i))}
    </ul>
  )

  const openItem = openId === null ? null : items.find(i => i.id === openId) ?? null

  return (
    <main className={cn('min-h-screen bg-bg', cartCount > 0 ? 'pb-44' : 'pb-28')}>
      <h1 className="sr-only">Menu</h1>
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <TextInput
          ref={searchRef}
          label="Search the menu"
          hideLabel
          inputMode="search"
          placeholder={`Search ${RESTAURANT.shortName}`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          leftIcon={<Search />}
          rightSlot={query ? (
            <IconButton label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus() }}>
              <X />
            </IconButton>
          ) : undefined}
          enterKeyHint="search"
          className="[&_input]:rounded-full"
        />
      </div>

      {/* Section tabs stick to the top (under the header where it is pinned, not at all on short screens) */}
      {!q && (
        <nav ref={navRef} aria-label="Menu sections" className="sticky top-0 z-30 mt-3 border-b border-line bg-bg roomy:top-16 short:static">
          <div ref={stripRef} className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 scrollbar-hide">
            {sections.map(s => {
              const current = active === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  data-section={s.id}
                  onClick={() => jump(s.id)}
                  aria-current={current ? 'true' : undefined}
                  className={cn(
                    'relative flex h-12 shrink-0 items-center px-3 text-[15px] font-semibold transition-colors duration-150',
                    current ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {s.title}
                  {current && (
                    <motion.span
                      layoutId="menu-tab-line"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-ink forced-colors:bg-[CanvasText]"
                      aria-hidden
                    />
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-3xl animate-enter px-4 pt-5">
        {q ? (
          results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              body="Try another word, or clear the search to see the whole menu."
              action={<Button onClick={() => setQuery('')}>Show the whole menu</Button>}
            />
          ) : (
            <section aria-label="Search results">
              <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
                {results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”
              </p>
              {grid(results, 'results')}
            </section>
          )
        ) : (
          <div className="space-y-9">
            {sections.map(s => (
              <section key={s.id} id={`section-${s.id}`} aria-labelledby={`heading-${s.id}`}>
                <h2 id={`heading-${s.id}`} tabIndex={-1} className="flex items-center gap-2 font-display text-[22px] tracking-[-0.02em] text-ink outline-none">
                  {s.id === 'popular' && <Flame className="h-5 w-5 text-accent-text" aria-hidden />}
                  {s.title}
                </h2>
                {s.subtitle && <p className="mt-1 text-sm text-ink-muted">{s.subtitle}</p>}
                <div className="mt-3">{grid(s.items, s.id)}</div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-muted">
          Ordering by <span className="font-display text-sm text-ink">Qyou</span>
        </p>
      </div>

      <MenuItemSheet
        item={openItem}
        available={openItem ? isAvailable(openItem) : false}
        qty={openItem ? getQty(openItem.id) : 0}
        groups={openItem ? groupsForItem(openItem) : []}
        onClose={() => setOpenId(null)}
        onAdd={button => openItem && add(openItem, button)}
        onChange={next => openItem && setQty(openItem, next)}
        onAddWithOptions={(choices, quantity, button) => openItem && addWithOptions(openItem, choices, quantity, button)}
      />

      {/* Cart bar, above the bottom navigation */}
      <AnimatePresence>
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-3 short:bottom-[calc(3rem+env(safe-area-inset-bottom))] short:pb-2"
        >
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true }, 'mx-auto flex max-w-3xl justify-between shadow-pop short:h-11')}
          >
            <span>View cart · {cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            <span className="tabular-nums">{peso(cartTotal)}</span>
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </main>
  )
}
