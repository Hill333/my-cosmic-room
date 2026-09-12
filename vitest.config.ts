import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests cover src/core, src/catalog and src/strings (pure modules, no DOM).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/catalog/**', 'src/strings/**'],
    },
  },
});
