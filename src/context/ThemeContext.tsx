import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)
const LS_KEY = 'qyou_theme'
const LS_KITCHEN_KEY = 'qyou_kitchen_theme'

function readTheme(key: string, fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* noop */ }
  return fallback
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readTheme(LS_KEY, 'light'))

  // Apply the app-wide mode to <html>; subtrees may override with their own data-theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Browser toolbar color (iPhone Safari tints its bars with it): the page background of this mode
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    try { localStorage.setItem(LS_KEY, theme) } catch { /* noop */ }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const isDark = theme === 'dark'

  const value = useMemo(() => ({ theme, toggleTheme, isDark }), [theme, toggleTheme, isDark])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/**
 * The kitchen screen's own mode, separate from the app-wide one.
 * Defaults to dark; apply it with `data-theme={theme}` on the kitchen root.
 */
export function useKitchenTheme() {
  const [theme, setTheme] = useState<Theme>(() => readTheme(LS_KITCHEN_KEY, 'dark'))

  useEffect(() => {
    try { localStorage.setItem(LS_KITCHEN_KEY, theme) } catch { /* noop */ }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  return { theme, toggle }
}
