import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { IconButton } from './ui'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()
  return (
    <IconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={className}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  )
}
