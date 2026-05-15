import { Smartphone, Coffee } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
const TABLE_NAMES: Record<number, string> = {
  1: 'Table 1',
  2: 'Table 2',
  3: 'Table 3',
  4: 'Table 4',
  5: 'Table 5',
  6: 'Table 6',
  7: 'Table 7',
  8: 'Table 8',
  9: 'Table 9',
  10: 'Table 10',
}
export default function TokenValidation() {
  const navigate = useNavigate()
  const { tableId } = useParams()
  const { setTableSession } = useAuth()
  const [name, setName] = useState('')
  const tid = Number(tableId) || 1
  const tname = TABLE_NAMES[tid] || `Table ${tid}`
  const handleContinue = useCallback(() => {
    if (!name.trim()) return
    setTableSession(tid, tname, name.trim())
    navigate('/menu')
  }, [name, tid, tname, setTableSession, navigate])
  return (

    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-14">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-glow border border-primary/30 mb-5">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-base">DeVerse Cafe</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Smartphone className="w-4 h-4 text-text-muted" />
            <p className="text-text-muted text-sm">{tname}</p>
          </div>
        </div>
        {/* Name input */}
        <div className="mb-4">
          <label className="block text-text-muted text-xs font-medium mb-2">Your name</label>
          <input
            type="text"
            placeholder="Enter your name to continue"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            autoFocus
          />
        </div>
        <button
          onClick={handleContinue}
          disabled={!name.trim()}
          className="w-full btn-primary py-4 rounded-xl font-semibold text-background text-base
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Start Ordering
        </button>
        <p className="text-center text-text-faint text-xs mt-6">
          Your name helps us identify your order at {tname}
        </p>
      </div>
    </div>
  )
}
