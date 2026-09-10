import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,onnx}"],
        // The OCR model (~11 MB) and the WASM runtime (~13 MB) both blow past
        // workbox's 2 MiB default, which would drop them from the precache and
        // leave the kiosk unable to read an odometer offline.
        maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
      },
      manifest: {
        name: "Fleetora Entry",
        short_name: "Entry",
        description: "Gate entry kiosk for Fleetora fleet management.",
        theme_color: "#0a1222",
        background_color: "#0a1222",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // onnxruntime-web's exports map doesn't expose dist/*.wasm, and its
      // default is to fetch the runtime from a CDN — no good for a gate kiosk
      // that has to work offline. Aliasing the file lets Vite fingerprint and
      // serve it locally, and the service worker precache it.
      "ort-wasm-binary": path.resolve(
        import.meta.dirname,
        "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
      ),
    },
  },
  server: { port: 5175, strictPort: true },
});
