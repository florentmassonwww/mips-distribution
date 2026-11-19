import { defineConfig } from "vite";

// In development the API runs separately (npm run start -w @mips/api, port 8788) and /api is
// proxied to it. The production build is served by apps/api itself (same origin).
export default defineConfig({
  server: { port: 5173, proxy: { "/api": "http://localhost:8788" } },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
});
