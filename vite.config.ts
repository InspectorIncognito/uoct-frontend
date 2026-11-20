import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import loadVersion from "vite-plugin-package-version";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), loadVersion()],
  optimizeDeps: {
    esbuildOptions: { target: "es2020" },
  },
  define: {
    // vue-i18n esm-bundler feature flags (silences the console warning and tree-shakes).
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // Vite 3's default target includes Safari 13, which lacks BigInt literals
    // used by mapbox-gl 3.31. Mapbox GL 3 already requires WebGL2 browsers.
    target: ["es2020", "chrome87", "edge88", "firefox78", "safari14"],
    rollupOptions: {
      output: {
        manualChunks: {
          "mapbox-gl": ["mapbox-gl"],
          vendor: ["vue", "vue-router", "pinia", "element-plus", "@element-plus/icons-vue"],
        },
      },
    },
  },
});
