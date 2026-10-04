import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the same build works on GitHub Pages and inside the native apps.
  base: './',
  plugins: [react(), tailwindcss()],
})
