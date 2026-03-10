import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import loadVersion from "vite-plugin-package-version";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), loadVersion()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "mapbox-gl": ["mapbox-gl"],
          "element-plus": ["element-plus", "@element-plus/icons-vue"],
          "vue-vendor": ["vue", "vue-router", "pinia"],
        },
      },
    },
  },
});
