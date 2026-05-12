import {
  createContext, useContext, useState, useCallback, useMemo,
  type ReactNode,
} from 'react'

// ─── Auth Context ─────────────────────────────────────────────────────────────
// Separated from AppContext so auth changes don't re-render order/menu consumers
interface AuthContextType {
  isStaff: boolean
  staffLogin: (pin: string) => boolean
  staffLogout: () => void
  customerName: string
  setCustomerName: (name: string) => void
  tableId: number | null
  tableName: string
  setTableSession: (tableId: number, tableName: string, customerName: string) => void
  clearSession: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)
const STAFF_PIN = '1234'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isStaff, setIsStaff]           = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [tableId, setTableId]           = useState<number | null>(null)
  const [tableName, setTableName]       = useState('')

  const staffLogin = useCallback((pin: string): boolean => {
    if (pin === STAFF_PIN) { setIsStaff(true); return true }
    return false
  }, [])

  const staffLogout = useCallback(() => setIsStaff(false), [])

  const setTableSession = useCallback((tid: number, tname: string, cname: string) => {
    setTableId(tid); setTableName(tname); setCustomerName(cname)
  }, [])

  const clearSession = useCallback(() => {
    setTableId(null); setTableName(''); setCustomerName('')
  }, [])

  const value = useMemo(() => ({
    isStaff, staffLogin, staffLogout,
    customerName, setCustomerName,
    tableId, tableName, setTableSession, clearSession,
  }), [
    isStaff, staffLogin, staffLogout,
    customerName, tableId, tableName, setTableSession, clearSession,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
