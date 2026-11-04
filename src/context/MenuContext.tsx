import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
  type ReactNode,
} from 'react'
import { BUILT_IN_PHOTOS, OPTION_GROUPS, SEED_MENU, type MenuItem } from '../constants/menu'
import { orderSync, type LiveMenuItem, type LiveOptionGroup, type MenuItemInput, type OptionGroupSave } from '../services/orderSync'
import { groupsFor, orderErrorText } from '../services/orderModel'

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
  /** Option groups that exist (size, sugar…), by id. */
  optionGroups: LiveOptionGroup[]
  /** Every group the backend knows, removed ones included, for checking a cart line. */
  allOptionGroups: LiveOptionGroup[]
  /** The groups an item asks for, in its order. */
  groupsForItem: (item: Pick<MenuItem, 'optionGroupIds'>) => LiveOptionGroup[]
  /** Staff: add or edit a group. */
  saveOptionGroup: (group: OptionGroupSave) => Promise<LiveOptionGroup>
  removeOptionGroup: (id: number) => Promise<void>
  /** Staff: sold out / back on. Rejects with words to show if the server refuses. */
  toggleItemAvailability: (id: number) => Promise<void>
  /** Resolves with the item as saved (a new item gets its id from the server). */
  saveItem: (item: MenuItemInput) => Promise<LiveMenuItem>
  removeItem: (id: number) => Promise<void>
  /** Starts following the live menu (useMenu does this). */
  start: () => void
}

const MenuContext = createContext<MenuContextType | null>(null)

const seed = (): Map<number, LiveMenuItem> =>
  new Map(SEED_MENU.map(m => [m.id, { ...m, addon: !!m.addon, optionGroupIds: m.optionGroupIds ?? [], active: true }]))
const seedGroups = (): LiveOptionGroup[] => OPTION_GROUPS.map(g => ({ ...g, active: true }))

// The backend keeps no photos yet: the built-in ones come back by item id
const withPhoto = (row: LiveMenuItem): LiveMenuItem =>
  row.image || !BUILT_IN_PHOTOS.has(row.id) ? row : { ...row, image: BUILT_IN_PHOTOS.get(row.id) }

export function MenuProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Map<number, LiveMenuItem>>(seed)
  const [menuLive, setMenuLive] = useState(false)
  const [groups, setGroups] = useState<LiveOptionGroup[]>(seedGroups)
  const started = useRef(false)
  const stop = useRef<(() => void)[]>([])

  const upsert = useCallback((row: LiveMenuItem) => {
    setById(prev => new Map(prev).set(row.id, withPhoto(row)))
  }, [])

  const upsertGroup = useCallback((row: LiveOptionGroup) => {
    setGroups(prev => [...prev.filter(g => g.id !== row.id), row].sort((a, b) => a.id - b.id))
  }, [])

  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    stop.current = [
      orderSync.menu.subscribe({
        snapshot: rows => {
          setById(new Map(rows.map(r => [r.id, withPhoto(r)])))
          setMenuLive(true)
        },
        change: upsert,
        down: () => { /* keep showing the last menu we had */ },
      }),
      orderSync.options.subscribe({
        snapshot: rows => setGroups([...rows].sort((a, b) => a.id - b.id)),
        change: upsertGroup,
        down: () => { /* keep the last options we had */ },
      }),
    ]
  }, [upsert, upsertGroup])

  useEffect(() => () => stop.current.forEach(s => s()), [])

  const call = useCallback(async (write: () => Promise<LiveMenuItem>) => {
    try {
      const saved = await write()
      upsert(saved)
      return withPhoto(saved)
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
  const removeItem = useCallback(async (id: number) => { await call(() => orderSync.menu.remove(id)) }, [call])

  const saveOptionGroup = useCallback(async (group: OptionGroupSave) => {
    try {
      const saved = await orderSync.options.save(group)
      upsertGroup(saved)
      return saved
    } catch (err) {
      throw new Error(orderErrorText(err))
    }
  }, [upsertGroup])

  const removeOptionGroup = useCallback(async (id: number) => {
    try {
      upsertGroup(await orderSync.options.remove(id))
    } catch (err) {
      throw new Error(orderErrorText(err))
    }
  }, [upsertGroup])

  const value = useMemo(() => {
    const active = [...byId.values()].filter(m => m.active).sort((a, b) => a.id - b.id)
    return {
      items: active.filter(m => !m.addon),
      addOns: active.filter(m => m.addon),
      byId,
      itemAvailability: Object.fromEntries(active.map(m => [m.id, m.available])),
      menuLive,
      optionGroups: groups.filter(g => g.active),
      allOptionGroups: groups,
      groupsForItem: (item: Pick<MenuItem, 'optionGroupIds'>) => groupsFor(item, groups) as LiveOptionGroup[],
      toggleItemAvailability, saveItem, removeItem, saveOptionGroup, removeOptionGroup, start,
    }
  }, [byId, menuLive, groups, toggleItemAvailability, saveItem, removeItem, saveOptionGroup, removeOptionGroup, start])

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
