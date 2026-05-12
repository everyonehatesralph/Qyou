import {
  createContext, useContext, useState, useCallback, useMemo,
  useEffect, type ReactNode,
} from 'react'
import { MENU_ITEMS } from '../constants/menu'
import { broadcast, onSync } from './BroadcastSync'

// ─── Menu Availability Context ─────────────────────────────────────────────────
// Controls which items are available today. Uses BroadcastChannel for instant
// cross-tab sync (<5ms) instead of the old 2s polling.
const LS_AVAILABILITY = 'deverse_availability'

function loadAvailability(): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(LS_AVAILABILITY)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return Object.fromEntries(MENU_ITEMS.map(i => [i.id, i.available]))
}

interface MenuAvailabilityContextType {
  itemAvailability: Record<number, boolean>
  toggleItemAvailability: (id: number) => void
}

const MenuAvailabilityContext = createContext<MenuAvailabilityContextType | null>(null)

export function MenuAvailabilityProvider({ children }: { children: ReactNode }) {
  const [itemAvailability, setItemAvailabilityRaw] = useState<Record<number, boolean>>(loadAvailability)

  const persistAndBroadcast = useCallback((next: Record<number, boolean>) => {
    try { localStorage.setItem(LS_AVAILABILITY, JSON.stringify(next)) } catch { /* noop */ }
    broadcast('availability_updated', next)
  }, [])

  const toggleItemAvailability = useCallback((id: number) => {
    setItemAvailabilityRaw(prev => {
      const next = { ...prev, [id]: !prev[id] }
      persistAndBroadcast(next)
      return next
    })
  }, [persistAndBroadcast])

  // ── Instant cross-tab sync via BroadcastChannel ──
  useEffect(() => {
    const unsub = onSync('availability_updated', (payload) => {
      setItemAvailabilityRaw(payload as Record<number, boolean>)
    })
    return unsub
  }, [])

  // ── StorageEvent fallback (for tabs that don't support BroadcastChannel) ──
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_AVAILABILITY && e.newValue) {
        try { setItemAvailabilityRaw(JSON.parse(e.newValue)) } catch { /* noop */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({
    itemAvailability, toggleItemAvailability,
  }), [itemAvailability, toggleItemAvailability])

  return (
    <MenuAvailabilityContext.Provider value={value}>
      {children}
    </MenuAvailabilityContext.Provider>
  )
}

export function useMenuAvailability() {
  const ctx = useContext(MenuAvailabilityContext)
  if (!ctx) throw new Error('useMenuAvailability must be used within MenuAvailabilityProvider')
  return ctx
}
