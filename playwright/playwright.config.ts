/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './playwright',
  grep: [],
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  worker: 'process',
  // Use Chromium by default; set PLAYWRIGHT_BROWSERS_CHROMIUM=0 to skip
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    // https://playwright.dev/docs/api/page#page-goto
    // https://playwright.dev/docs/apikeyboard
    // https://playwright.dev/docs/keyboard
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'Chromium',
      use: {
        ...config.use,
        browser: 'chromium',
      },
    },
  ],

  // Timeout for test file setups
  timeout: 30000,
};

module.exports = config;