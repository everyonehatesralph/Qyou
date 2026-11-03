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
// One mode for the whole app, remembered per device (a kitchen tablet set to dark stays dark)
const LS_KEY = 'qyou_theme'

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
