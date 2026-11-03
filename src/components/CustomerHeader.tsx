import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RESTAURANT } from '../config/restaurant'
import { IconButton, LetterTile } from './ui'
import ThemeToggle from './ThemeToggle'
import HelpAssistant from './HelpAssistant'

/** Top bar on customer screens: restaurant name, who is ordering at which table, help and theme. */
export default function CustomerHeader() {
  const navigate = useNavigate()
  const { customerName, tableName } = useAuth()
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-control py-1 text-left"
        >
          <LetterTile text={RESTAURANT.logoText} tone="accent" size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[18px] leading-tight text-ink">{RESTAURANT.name}</span>
            <span className="block truncate text-[13px] text-ink-muted">
              {customerName ? `Hi ${customerName}${tableName ? ` · ${tableName}` : ''}` : 'Ordering by Qyou'}
            </span>
          </span>
        </button>
        <div className="-mr-2 flex items-center">
          <IconButton label="Help" onClick={() => setHelpOpen(true)}>
            <HelpCircle />
          </IconButton>
          <ThemeToggle />
        </div>
      </div>
      <HelpAssistant open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  )
}
