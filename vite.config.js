// frontend/vite.config.js
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  envDir: __dirname,

  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "https://tsu-thesis-backend.onrender.com",
        // target: "http://localhost:9000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "https://tsu-thesis-backend.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
