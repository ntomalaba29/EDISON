import fs from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';

const SYSTEM_HEADLESS_SHELL = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

function resolveChromiumExecutable(): string | undefined {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (explicit) return explicit;
  try {
    const defaultExe = chromium.executablePath();
    if (defaultExe && fs.existsSync(defaultExe)) {
      return undefined;
    }
  } catch {
    // Fallback below when default Playwright revision binary is not installed
  }
  return fs.existsSync(SYSTEM_HEADLESS_SHELL) ? SYSTEM_HEADLESS_SHELL : undefined;
}

const resolvedExecutablePath = resolveChromiumExecutable();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    ...(resolvedExecutablePath ? { launchOptions: { executablePath: resolvedExecutablePath } } : {}),
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
