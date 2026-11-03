import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import type { ReactNode } from 'react'
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isStaff, authReady } = useAuth()
  // A saved staff sign-in is still being checked
  if (!authReady) return <LoadingSpinner />
  if (!isStaff) return <Navigate to="/staff/login" replace />
  return <>{children}</>
}
