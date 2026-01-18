import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { writeFileSync, readFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    {
      name: 'spa-fallback',
      closeBundle() {
        const index = readFileSync('dist/index.html', 'utf-8')
        writeFileSync('dist/404.html', index)
      }
    }
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
})
