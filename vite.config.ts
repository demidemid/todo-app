import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('/@firebase/auth') || id.includes('/firebase/auth')) {
            return 'vendor-firebase-auth'
          }

          if (id.includes('/@firebase/firestore') || id.includes('/firebase/firestore')) {
            return 'vendor-firebase-firestore'
          }

          if (id.includes('/@firebase/storage') || id.includes('/firebase/storage')) {
            return 'vendor-firebase-storage'
          }

          if (
            id.includes('/firebase/')
            || id.includes('/@firebase/')
            || id.includes('/idb/')
          ) {
            return 'vendor-firebase-core'
          }

          if (id.includes('/prosemirror-')) {
            return 'vendor-editor-prosemirror'
          }

          if (id.includes('/@tiptap/')) {
            return 'vendor-editor-tiptap'
          }

          if (id.includes('/@radix-ui/react-toolbar')) {
            return 'vendor-editor-toolbar'
          }

          if (id.includes('/linkifyjs')) {
            return 'vendor-editor-linkify'
          }

          if (
            id.includes('/react-dom/')
            || id.includes('/react-router/')
            || id.includes('/react-router-dom/')
            || id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('/lucide-react/') || id.includes('/react-icons/')) {
            return 'vendor-icons'
          }

          if (id.includes('/zustand/')) {
            return 'vendor-state'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})
