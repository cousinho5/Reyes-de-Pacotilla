import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, /api va al servidor local de wrangler.
    proxy: { "/api": "http://localhost:8787" },
  },
});
