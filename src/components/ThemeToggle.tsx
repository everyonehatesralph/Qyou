import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface ThemeToggleProps {
  /** 'nav' = compact for navbar, 'floating' = absolute positioned for landing page */
  variant?: 'nav' | 'floating'
}

export default function ThemeToggle({ variant = 'nav' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  if (variant === 'floating') {
    return (
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90"
        style={{
          backgroundColor: isDark ? 'rgba(240,230,211,0.1)' : 'rgba(0,0,0,0.08)',
          border: `1px solid ${isDark ? 'rgba(240,230,211,0.15)' : 'rgba(0,0,0,0.1)'}`,
          backdropFilter: 'blur(12px)',
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark
          ? <Sun className="w-5 h-5" style={{ color: '#E8C97A' }} />
          : <Moon className="w-5 h-5" style={{ color: '#6B5E52' }} />
        }
      </button>
    )
  }

  // Nav variant — compact pill
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg transition-all duration-300 active:scale-90"
      style={{
        backgroundColor: isDark ? 'rgba(200,134,10,0.1)' : 'rgba(0,0,0,0.06)',
        color: isDark ? '#E8C97A' : '#6B5E52',
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
