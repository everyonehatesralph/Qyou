import express from 'express'
import cors from 'cors'
import path from 'path'

const app = express()
const PORT = process.env.VITE_SERVER_PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍰 DeVerse Cafe server running on http://0.0.0.0:${PORT}`)
})
