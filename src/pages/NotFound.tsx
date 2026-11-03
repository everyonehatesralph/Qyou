import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        body="This page doesn't exist. Check the link, or go back to the start."
        action={<Button onClick={() => navigate('/')}>Go home</Button>}
      />
    </div>
  )
}
