import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Versión de esta compilación: el mapa guardado en el móvil se dibuja otra vez con cada una (worldStore.ts).
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
  server: {
    // En desarrollo, /api va al servidor local de wrangler.
    proxy: { "/api": "http://localhost:8787" },
  },
});
