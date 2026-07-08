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
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "any",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        categories: ["government", "security", "transportation"],
        shortcuts: [
          {
            name: "Dashboard da Guarda",
            short_name: "Guarda",
            description: "Acessar o painel da Guarda Municipal",
            url: "/admin/perfil-guardas/guarda-municipal/dashboard",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "IROs da Guarda",
            short_name: "IROs",
            description: "Ver operações e candidaturas IRO",
            url: "/admin/perfil-guardas/guarda-municipal/iros",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Portal DEMUTRAN",
            short_name: "DEMUTRAN",
            description: "Acessar serviços públicos do DEMUTRAN",
            url: "/demutran",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Fala Cidadão",
            short_name: "Fala Cidadão",
            description: "Abrir uma nova solicitação",
            url: "/fala-cidadao/nova-solicitacao",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        icons: [
          { src: "pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/[^_]*$/],
        importScripts: ["/sw-notifications.js"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/jpztntmwmrhdobxsyulj\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/jpztntmwmrhdobxsyulj\.supabase\.co\/storage\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
