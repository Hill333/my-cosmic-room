import { defineConfig, devices } from '@playwright/test';

// End-to-end smoke flows (SPEC §17.8) run against the Vite preview server.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  projects: [
    // Local default: the installed Google Chrome, so no Playwright browser download is needed.
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    // CI: Playwright's own Chromium (selected explicitly with --project=chromium-ci).
    { name: 'chromium-ci', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
