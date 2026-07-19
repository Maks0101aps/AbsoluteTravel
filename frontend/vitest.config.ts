import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const testResolver = {
  name: 'test-resolver',
  resolveId(source: string, importer: string | undefined) {
    if (importer && importer.includes('tests/fe-tests') && source.startsWith('./')) {
      const name = source.slice(2);
      const possiblePaths = [
        path.resolve(__dirname, 'src', name),
        path.resolve(__dirname, 'src', 'data', name),
        path.resolve(__dirname, 'src', 'exploration', name),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
          for (const ext of ['.ts', '.tsx', '.json', '.js', '.jsx']) {
            const indexPath = path.join(p, 'index' + ext);
            if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
              return indexPath;
            }
          }
        }
        for (const ext of ['', '.ts', '.tsx', '.json', '.js', '.jsx']) {
          const fullPath = p + ext;
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            return fullPath;
          }
        }
      }
    }
    return null;
  }
};

// Separate from vite.config.ts on purpose: that file wires up vite-plugin-pwa
// (service worker generation, manifest, virtual:pwa-register/react), which has
// no reason to run under the test runner and only adds noise/slowness there.
export default defineConfig({
  plugins: [react(), testResolver],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      '@testing-library/react': path.resolve(__dirname, 'node_modules', '@testing-library/react'),
      '@testing-library/jest-dom': path.resolve(__dirname, 'node_modules', '@testing-library/jest-dom'),
      '@testing-library/user-event': path.resolve(__dirname, 'node_modules', '@testing-library/user-event'),
      'react': path.resolve(__dirname, 'node_modules', 'react'),
      'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
      'react-i18next': path.resolve(__dirname, 'node_modules', 'react-i18next'),
      'i18next': path.resolve(__dirname, 'node_modules', 'i18next'),
    },
  },
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
