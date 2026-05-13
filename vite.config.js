import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Prevent @vitejs/plugin-react from re-throwing Rolldown externalization
      // warnings as build errors on Vercel (Linux) with Vite 8 + Rolldown.
      jsxRuntime: 'automatic',
    }),
  ],
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        // Suppress "module externalized for browser compatibility" warnings that
        // Rolldown emits for Node built-ins pulled in by @supabase/supabase-js.
        if (warning.code === 'UNRESOLVED_IMPORT' || warning.message?.includes('externalized for browser compatibility')) return;
        warn(warning);
      },
    },
  },
})
