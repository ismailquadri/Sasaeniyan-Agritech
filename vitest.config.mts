import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/env.ts'],
    // e2e test files share one Postgres instance and reset it via resetDemo();
    // running them in parallel workers races on the same tables.
    fileParallelism: false,
  },
})
