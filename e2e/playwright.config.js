// @ts-check
const { defineConfig } = require('@playwright/test');

// Ports dédiés pour ne pas entrer en conflit avec un `npm run dev` ouvert.
const API_PORT = 3998;
const WEB_PORT = 5188;

// L'API tourne en mémoire (données de démo ré-injectées à chaque démarrage)
// et SANS services externes : ni email (Resend), ni stockage Supabase, ni
// push — les tests ne doivent jamais toucher la prod ni envoyer de message.
const apiEnv = {
  PORT: String(API_PORT),
  NODE_ENV: 'development',
  DATABASE_URL: '',
  CORS_ORIGIN: `http://127.0.0.1:${WEB_PORT}`,
  APP_URL: `http://127.0.0.1:${WEB_PORT}`,
  RESEND_API_KEY: '',
  SUPABASE_URL: '',
  SUPABASE_SERVICE_KEY: '',
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  JWT_SECRET: 'e2e-secret',
};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  // Une seule base en mémoire partagée : on exécute en série.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    // Chrome installé sur la machine ; en CI : `npx playwright install chromium`
    // et retirer `channel`.
    channel: process.env.CI ? undefined : 'chrome',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.js/, use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.js/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: 'node index.js',
      cwd: '../server',
      env: apiEnv,
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../client',
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
