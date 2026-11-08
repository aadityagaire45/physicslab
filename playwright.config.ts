import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests. By default the locally installed Microsoft Edge
 * (always present on Windows 11) is used so no browser download is needed.
 * Set PLAYWRIGHT_CHANNEL=chromium after `npx playwright install chromium`
 * to use Playwright's bundled browser instead.
 */
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browserOptions = channel === 'chromium' ? {} : { channel };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browserOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browserOptions } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
