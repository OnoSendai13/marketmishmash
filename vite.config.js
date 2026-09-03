import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite
// allowedHosts: true permet l'accès via des URLs de prévisualisation distantes.
// Le proxy « /yahoo » relaie les appels vers Yahoo Finance pour contourner CORS
// (Yahoo ne renvoie pas d'en-tête CORS ; le navigateur bloquerait un appel direct).
// On force un User-Agent « navigateur » : sans lui, Yahoo répond 429 (anti-bot).
const yahooProxy = {
  '/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/yahoo/, ''),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  },
  // Proxy vers le micro-backend d'analyse Python (FastAPI, Phase 1).
  // Lancez-le en parallèle : cd backend && ./start.sh  (port 9100).
  '/api': {
    target: 'http://localhost:9100',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 9000,
    allowedHosts: true,
    proxy: yahooProxy,
  },
  // Le proxy est aussi appliqué en `npm run preview`.
  preview: {
    host: true,
    port: 9000,
    allowedHosts: true,
    proxy: yahooProxy,
  },
})
