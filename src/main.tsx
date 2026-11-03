import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { MotionConfig } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import { applyRestaurantTheme } from './theme/accent'

applyRestaurantTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Animations follow the device's reduced-motion setting */}
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <App />
      </AppProvider>
    </MotionConfig>
  </React.StrictMode>,
)
