import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
  type ReactNode,
} from 'react'
import { SEED_MENU, type MenuItem } from '../constants/menu'
import { orderSync, type LiveMenuItem, type MenuItemInput } from '../services/orderSync'
import { orderErrorText } from '../services/orderModel'

// ─── Menu Context ─────────────────────────────────────────────────────────────
// The live menu from the order backend: what guests can order, at the price the server
// charges, and what staff edit. Until it loads, the starting menu in constants/menu.ts
// stands in (the same data on a fresh install). The feed starts on first useMenu(), so
// the landing page never opens one.
interface MenuContextType {
  /** Menu items guests see, in menu order; add-ons and removed items left out. */
  items: MenuItem[]
  /** Extras offered at checkout. */
  addOns: MenuItem[]
  /** Every item the backend knows, removed ones included (they keep their ids). */
  byId: Map<number, LiveMenuItem>
  itemAvailability: Record<number, boolean>
  /** True once the menu has come from the backend at least once. */
  menuLive: boolean
  /** Staff: sold out / back on. Rejects with words to show if the server refuses. */
  toggleItemAvailability: (id: number) => Promise<void>
  saveItem: (item: MenuItemInput) => Promise<void>
  removeItem: (id: number) => Promise<void>
  /** Starts following the live menu (useMenu does this). */
  start: () => void
}

const MenuContext = createContext<MenuContextType | null>(null)

const seed = (): Map<number, LiveMenuItem> =>
  new Map(SEED_MENU.map(m => [m.id, { ...m, addon: !!m.addon, active: true }]))

export function MenuProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Map<number, LiveMenuItem>>(seed)
  const [menuLive, setMenuLive] = useState(false)
  const started = useRef(false)
  const stop = useRef<(() => void) | null>(null)

  const upsert = useCallback((row: LiveMenuItem) => {
    setById(prev => new Map(prev).set(row.id, row))
  }, [])

  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    stop.current = orderSync.menu.subscribe({
      snapshot: rows => {
        setById(new Map(rows.map(r => [r.id, r])))
        setMenuLive(true)
      },
      change: upsert,
      down: () => { /* keep showing the last menu we had */ },
    })
  }, [upsert])

  useEffect(() => () => stop.current?.(), [])

  const call = useCallback(async (write: () => Promise<LiveMenuItem>) => {
    try {
      upsert(await write())
    } catch (err) {
      throw new Error(orderErrorText(err))
    }
  }, [upsert])

  const toggleItemAvailability = useCallback(async (id: number) => {
    const item = byId.get(id)
    if (!item) return
    // Show it at once; put it back if the server says no
    upsert({ ...item, available: !item.available })
    try {
      await call(() => orderSync.menu.setAvailable(id, !item.available))
    } catch (err) {
      upsert(item)
      throw err
    }
  }, [byId, call, upsert])

  const saveItem = useCallback((item: MenuItemInput) => call(() => orderSync.menu.save(item)), [call])
  const removeItem = useCallback((id: number) => call(() => orderSync.menu.remove(id)), [call])

  const value = useMemo(() => {
    const active = [...byId.values()].filter(m => m.active).sort((a, b) => a.id - b.id)
    return {
      items: active.filter(m => !m.addon),
      addOns: active.filter(m => m.addon),
      byId,
      itemAvailability: Object.fromEntries(active.map(m => [m.id, m.available])),
      menuLive,
      toggleItemAvailability, saveItem, removeItem, start,
    }
  }, [byId, menuLive, toggleItemAvailability, saveItem, removeItem, start])

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/** The menu without starting the live feed (for providers that sit under every page). */
export function useMenuState() {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('useMenu must be used within MenuProvider')
  return ctx
}

export function useMenu() {
  const ctx = useMenuState()
  const { start } = ctx
  useEffect(() => { start() }, [start])
  return ctx
}

/** Older name, kept for existing callers. */
export const useMenuAvailability = useMenu
