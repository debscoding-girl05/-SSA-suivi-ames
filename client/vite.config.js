import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Vite 8 cible par défaut `safari16.4 / ios16.4` : tout iPhone resté sous
    // iOS 16.4 (iPhone 7, 6s, SE 1re gén. — bloqués sur iOS 15) recevait un
    // bundle qu'il ne sait pas parser → page blanche. On redescend la cible.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
})
