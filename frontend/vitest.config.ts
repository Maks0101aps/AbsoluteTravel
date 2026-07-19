import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts on purpose: that file wires up vite-plugin-pwa
// (service worker generation, manifest, virtual:pwa-register/react), which has
// no reason to run under the test runner and only adds noise/slowness there.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', '../tests/fe-tests/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    // Coverage instrumentation slows down transform/collection noticeably on
    // this many large TSX files — give tests more headroom than the 5s
    // default so a busy coverage run doesn't flake on otherwise-sync tests.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '../tests/**'
      ],
      thresholds: {
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },
  },
});
