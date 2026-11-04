import { TimerOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '../../components/ui'

export default function ExpiredSession() {
  const navigate = useNavigate()
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <EmptyState
        level={1}
        icon={TimerOff}
        title="Your session has ended"
        body="Scan the QR code on your table to start a new order."
        action={<Button onClick={() => navigate('/')}>Back to home</Button>}
      />
    </main>
  )
}
