import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createOrderSyncMiddleware } from './orderSyncPlugin.ts'

// package.json has "type": "module", so __dirname must be derived
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.VITE_SERVER_PORT || 3000

app.use(cors())
// Order API (same as the dev server). Mounted before express.json() because it reads the request body itself.
// Staff sign in with QYOU_STAFF_PIN; without it nobody can change orders.
app.use(createOrderSyncMiddleware({ staffPin: process.env.QYOU_STAFF_PIN }))
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
  console.log(`Qyou server running on http://0.0.0.0:${PORT}`)
})
