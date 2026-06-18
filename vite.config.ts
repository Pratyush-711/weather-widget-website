import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("./src", import.meta.url)
      ),
    },
  },

  server: {
    hmr: process.env.DISABLE_HMR !== "true",
    watch:
      process.env.DISABLE_HMR === "true"
        ? null
        : {},
  },
});