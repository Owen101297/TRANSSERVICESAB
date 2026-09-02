import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        setup_admin: resolve(__dirname, 'setup-admin.html'),
        admin_drivers: resolve(__dirname, 'admin_drivers.html'),
        admin_trips: resolve(__dirname, 'admin_trips.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: false,
    open: true
  },
  root: '.',
})
