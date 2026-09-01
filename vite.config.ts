import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
