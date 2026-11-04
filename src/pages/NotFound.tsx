import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <EmptyState
        level={1}
        icon={Compass}
        title="Page not found"
        body="This page doesn't exist. Check the link, or go back to the start."
        action={<Button onClick={() => navigate('/')}>Go home</Button>}
      />
    </main>
  )
}
