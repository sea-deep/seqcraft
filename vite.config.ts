import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8787"
    },
    headers: {
      "Origin-Agent-Cluster": "?1",
      "Permissions-Policy": "tools=(self)"
    }
  },
  preview: {
    headers: {
      "Origin-Agent-Cluster": "?1",
      "Permissions-Policy": "tools=(self)"
    }
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@seqcraft/genbank-parser": path.resolve(import.meta.dirname, "./node_modules/@teselagen/bio-parsers/src/genbankToJson.js"),
      "@teselagen/sequence-utils": path.resolve(import.meta.dirname, "./src/import/teselagen-sequence-utils-shim.ts"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
