import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app's `@/` import alias, which `tsconfig.json` gives TypeScript and
  // Next.js resolves at build time; vitest has its own resolver and needs it too.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Pure functions only: nothing here opens a socket or imports Next.js.
    include: ['src/**/*.test.ts'],
  },
});
