/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config doubles as the Vitest config (the `test` key below) — one
// file instead of two, since this project has no need to run Vitest with
// settings that differ from the dev/build config.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
