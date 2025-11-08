// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "rapidero-aza7f8a6gnewfgfx.centralindia-01.azurewebsites.net",
        changeOrigin: true,
      },
    },
  },
});
