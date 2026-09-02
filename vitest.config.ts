import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@seqcraft/genbank-parser': path.resolve(import.meta.dirname, './node_modules/@teselagen/bio-parsers/src/genbankToJson.js'),
      '@teselagen/sequence-utils': path.resolve(import.meta.dirname, './src/import/teselagen-sequence-utils-shim.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ["test/setup.ts"],
    globals: true,
    testTimeout: 15000,
    server: {
      deps: { inline: [/@teselagen\/bio-parsers/] },
    },
  },
})
