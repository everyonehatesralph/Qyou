import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { IconButton, cn } from './ui'

interface ThemeToggleProps {
  /** 'nav' sits inline in a header; 'floating' pins it to the top-right corner. */
  variant?: 'nav' | 'floating'
  /** Overrides the app-wide mode (e.g. the kitchen screen's own setting). */
  theme?: 'light' | 'dark'
  onToggle?: () => void
  className?: string
}

export default function ThemeToggle({ variant = 'nav', theme, onToggle, className }: ThemeToggleProps) {
  const app = useTheme()
  const isDark = (theme ?? app.theme) === 'dark'
  return (
    <IconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle ?? app.toggleTheme}
      variant={variant === 'floating' ? 'outline' : 'ghost'}
      className={cn(variant === 'floating' && 'fixed right-4 top-4 z-50', className)}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  )
}
