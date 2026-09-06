/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config doubles as the Vitest config (the `test` key below) — one
// file instead of two, since this project has no need to run Vitest with
// settings that differ from the dev/build config.
//
// `mode` also picks the babel-plugin-styled-components `ssr` option (see
// package.json's dev/dev:ssr and build/build:ssr scripts, and the
// "Styled-components debug names" section in README.md): this app has no
// server-rendering step, so `ssr` is off by default (`npm run dev` /
// `npm run build`) and only turned on for the `--mode ssr` variants, kept
// around to demonstrate the toggle rather than because this SPA needs it.
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            { displayName: true, fileName: true, ssr: mode === 'ssr' },
          ],
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}));
