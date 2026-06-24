import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "pwa-icon.svg"],
      manifest: {
        name: "SMST - Secretaria Municipal de Segurança Pública e Trânsito",
        short_name: "SMST Canindé",
        description:
          "Sistema de gestão da Secretaria de Segurança de Canindé - Guarda Municipal, DEMUTRAN e programas sociais.",
        theme_color: "#1e40af",
        background_color: "#f6f8fc",
        display: "standalone",
        orientation: "any",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        categories: ["government", "security", "transportation"],
        icons: [
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
          { src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/jpztntmwmrhdobxsyulj\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/jpztntmwmrhdobxsyulj\.supabase\.co\/storage\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
