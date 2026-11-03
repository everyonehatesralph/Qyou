import { useEffect, useState } from 'react'
import { VolumeX } from 'lucide-react'
import { armSound, isSoundOn, onSoundChange } from '../services/sounds'
import { Button } from './ui'

/**
 * Staff screens that ring for new orders: says so while the browser still blocks sound
 * (a tablet that reopened with a saved sign-in has had no tap yet). Any tap fixes it.
 */
export default function SoundOffNotice() {
  const [on, setOn] = useState(isSoundOn)

  useEffect(() => {
    armSound()
    setOn(isSoundOn())
    return onSoundChange(setOn)
  }, [])

  if (on) return null
  return (
    <div role="status" className="flex items-center gap-3 rounded-card border border-status-waiting-text bg-status-waiting-bg px-4 py-3 text-status-waiting-text">
      <VolumeX className="h-5 w-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-medium">Sound is off, so new orders won't ring. Tap anywhere to turn it on.</p>
      {/* The tap itself unlocks sound; the button is just an obvious place to tap */}
      <Button size="md" className="h-9 shrink-0">Turn on</Button>
    </div>
  )
}
