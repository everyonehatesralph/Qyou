import { defineConfig } from '@playwright/test'

// Screen checks: every route at phone, tablet and desktop widths, light and dark.
// Runs a fresh dev server (so CSS always matches tailwind.config.js) and uses the
// installed Chrome, so no browser download is needed.
const PORT = 5175

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  projects: [
    { name: 'seed', testMatch: /seed\.setup\.ts/ },
    { name: 'screens', testMatch: /screens\.spec\.ts/, dependencies: ['seed'] },
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    // Motion settles instantly so contrast checks never catch a half-faded element
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
