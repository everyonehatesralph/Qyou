import { useEffect, useState } from 'react'

/** Current time in ms, refreshed every `intervalMs`. Drives "x min ago" labels. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Whole minutes between an ISO timestamp and `now`, never negative. */
export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
}

/** "just now", "5 min ago", "2 h ago" */
export function timeAgo(iso: string, now: number): string {
  const mins = minutesSince(iso, now)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)} h ago`
}

/** "2:41 PM" in the restaurant's locale. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}
