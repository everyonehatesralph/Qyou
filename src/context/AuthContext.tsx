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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isStaff, setIsStaff]           = useState(false)
  const [authReady, setAuthReady]       = useState(() => !orderSync.staff.mightHaveSession())
  const [customerName, setCustomerName] = useState('')
  const [tableId, setTableId]           = useState<number | null>(null)
  const [tableName, setTableName]       = useState('')

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
    setTableId(tid); setTableName(tname); setCustomerName(cname)
  }, [])

  const clearSession = useCallback(() => {
    setTableId(null); setTableName(''); setCustomerName('')
  }, [])

  const value = useMemo(() => ({
    isStaff, authReady, staffLogin, staffLogout,
    customerName, setCustomerName,
    tableId, tableName, setTableSession, clearSession,
  }), [
    isStaff, authReady, staffLogin, staffLogout,
    customerName, tableId, tableName, setTableSession, clearSession,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
