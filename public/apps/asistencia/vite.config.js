import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  server: {
    port: 5181,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
})