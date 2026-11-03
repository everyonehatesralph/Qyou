import {
  createContext, useContext, useState, useCallback, useMemo, useEffect,
  type ReactNode,
} from 'react'
import { orderSync, type StaffSignIn } from '../services/orderSync'

// ─── Auth Context ─────────────────────────────────────────────────────────────
// Separated from AppContext so auth changes don't re-render order/menu consumers.
// The staff PIN is checked by the order backend, never in the browser.
interface AuthContextType {
  isStaff: boolean
  /** False until a staff sign-in saved on this device has been checked. */
  authReady: boolean
  staffLogin: (pin: string) => Promise<StaffSignIn>
  staffLogout: () => void
  customerName: string
  setCustomerName: (name: string) => void
  tableId: number | null
  tableName: string
  setTableSession: (tableId: number, tableName: string, customerName: string) => void
  clearSession: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// A guest's table check-in survives reloads for a meal's length, so orders always carry the table
const LS_TABLE_SESSION = 'qyou_table_session'
const TABLE_SESSION_MS = 6 * 60 * 60_000

interface TableSession { tableId: number; tableName: string; customerName: string; at: number }

function loadTableSession(): TableSession | null {
  try {
    const raw = localStorage.getItem(LS_TABLE_SESSION)
    if (!raw) return null
    const s = JSON.parse(raw) as TableSession
    if (Number.isInteger(s.tableId) && s.tableId > 0 && Date.now() - s.at < TABLE_SESSION_MS) return s
    localStorage.removeItem(LS_TABLE_SESSION)
  } catch { /* noop */ }
  return null
}

function saveTableSession(s: TableSession | null) {
  try {
    if (s) localStorage.setItem(LS_TABLE_SESSION, JSON.stringify(s))
    else localStorage.removeItem(LS_TABLE_SESSION)
  } catch { /* noop */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(loadTableSession)
  const [isStaff, setIsStaff]           = useState(false)
  const [authReady, setAuthReady]       = useState(() => !orderSync.staff.mightHaveSession())
  const [customerName, setCustomerNameRaw] = useState(saved?.customerName ?? '')
  const [tableId, setTableId]           = useState<number | null>(saved?.tableId ?? null)
  const [tableName, setTableName]       = useState(saved?.tableName ?? '')

  // Staff stay signed in across reloads on their own device
  useEffect(() => {
    if (authReady) return
    let cancelled = false
    orderSync.staff.restore()
      .then(ok => { if (!cancelled) setIsStaff(ok) })
      .catch(() => { /* treated as signed out */ })
      .finally(() => { if (!cancelled) setAuthReady(true) })
    return () => { cancelled = true }
  }, [authReady])

  const staffLogin = useCallback(async (pin: string): Promise<StaffSignIn> => {
    const result = await orderSync.staff.signIn(pin)
    if (result === 'ok') setIsStaff(true)
    return result
  }, [])

  const staffLogout = useCallback(() => {
    setIsStaff(false)
    orderSync.staff.signOut().catch(() => { /* already signed out */ })
  }, [])

  const setTableSession = useCallback((tid: number, tname: string, cname: string) => {
    setTableId(tid); setTableName(tname); setCustomerNameRaw(cname)
    saveTableSession({ tableId: tid, tableName: tname, customerName: cname, at: Date.now() })
  }, [])

  const setCustomerName = useCallback((name: string) => {
    setCustomerNameRaw(name)
    const s = loadTableSession()
    if (s) saveTableSession({ ...s, customerName: name })
  }, [])

  const clearSession = useCallback(() => {
    setTableId(null); setTableName(''); setCustomerNameRaw('')
    saveTableSession(null)
  }, [])

  const value = useMemo(() => ({
    isStaff, authReady, staffLogin, staffLogout,
    customerName, setCustomerName,
    tableId, tableName, setTableSession, clearSession,
  }), [
    isStaff, authReady, staffLogin, staffLogout,
    customerName, setCustomerName, tableId, tableName, setTableSession, clearSession,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
