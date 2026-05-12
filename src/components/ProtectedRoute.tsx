import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isStaff } = useAuth()
  if (!isStaff) return <Navigate to="/staff/login" replace />
  return <>{children}</>
}