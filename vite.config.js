import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite
// allowedHosts: true permet l'accès via des URLs de prévisualisation distantes.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
  },
})
