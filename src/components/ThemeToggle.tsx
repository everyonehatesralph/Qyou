import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { IconButton } from './ui'

interface ThemeToggleProps {
  /** Overrides the app-wide mode (e.g. the kitchen screen's own setting). */
  theme?: 'light' | 'dark'
  onToggle?: () => void
  className?: string
}

export default function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  const app = useTheme()
  const isDark = (theme ?? app.theme) === 'dark'
  return (
    <IconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle ?? app.toggleTheme}
      className={className}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  )
}
