import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
  type ReactNode,
} from 'react'
import { RESTAURANT } from '../config/restaurant'
import { orderSync } from '../services/orderSync'
import { orderErrorText, type DiningTable } from '../services/orderModel'

// ─── Tables Context ───────────────────────────────────────────────────────────
// The tables guests can check in at, from the order backend; staff set how many on the
// Tables screen. Until the backend answers, the starting tables in src/config/restaurant.ts
// stand in. The feed starts on first useTables(), so the landing page never opens one.
interface TablesContextType {
  /** Open tables, by number. */
  tables: DiningTable[]
  /** True once the list has come from the backend at least once. */
  tablesLive: boolean
  /** A table's name, also for tables since switched off (old orders). */
  label: (id: number) => string
  /** Staff: tables 1..count open. Rejects with words to show if the server refuses. */
  setTableCount: (count: number) => Promise<void>
  start: () => void
}

const TablesContext = createContext<TablesContextType | null>(null)

const seed = (): DiningTable[] => RESTAURANT.tables.map(t => ({ ...t, active: true }))

export function TablesProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<DiningTable[]>(seed)
  const [tablesLive, setTablesLive] = useState(false)
  const started = useRef(false)
  const stop = useRef<(() => void) | null>(null)

  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    stop.current = orderSync.tables.subscribe({
      snapshot: rows => {
        setAll(rows)
        setTablesLive(true)
      },
      change: row => setAll(prev => [...prev.filter(t => t.id !== row.id), row]),
      down: () => { /* keep showing the last list we had */ },
    })
  }, [])

  useEffect(() => () => stop.current?.(), [])

  const setTableCount = useCallback(async (count: number) => {
    try {
      setAll(await orderSync.tables.setCount(count))
    } catch (err) {
      throw new Error(orderErrorText(err))
    }
  }, [])

  const value = useMemo(() => {
    const tables = all.filter(t => t.active).sort((a, b) => a.id - b.id)
    const names = new Map(all.map(t => [t.id, t.label]))
    return {
      tables,
      tablesLive,
      label: (id: number) => names.get(id) ?? `Table ${id}`,
      setTableCount,
      start,
    }
  }, [all, tablesLive, setTableCount, start])

  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>
}

export function useTables() {
  const ctx = useContext(TablesContext)
  if (!ctx) throw new Error('useTables must be used within TablesProvider')
  const { start } = ctx
  useEffect(() => { start() }, [start])
  return ctx
}
