import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import orderSyncPlugin from './server/orderSyncPlugin'

export default defineConfig({
  plugins: [react(), orderSyncPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,  // NEVER silently switch ports — QR codes depend on this exact port
    cors: true,
  },
  // ── Pre-bundle heavy deps for faster dev startup ──
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
      'qrcode.react',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // ── Chunk splitting for parallel loading & better cache ──
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — rarely changes, caches long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Heavy UI libs
          'vendor-ui': ['framer-motion', 'lucide-react', 'qrcode.react'],
          // Data layer
          'vendor-data': ['@supabase/supabase-js'],
        },
      },
    },
    // Target modern browsers for smaller output
    target: 'es2020',
    // Inline small assets to reduce HTTP requests
    assetsInlineLimit: 4096,
  },
})

