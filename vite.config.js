import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // exposes server to your LAN
    port: 5173,  // optional, default is 5173
  },
})
