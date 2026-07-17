import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

function htmlPwaTransform(isAdmin: boolean): Plugin {
  const title = isAdmin
    ? "SMST Admin - Gestão da Segurança Pública"
    : "SMST - Secretaria de Segurança de Canindé";
  const appName = isAdmin ? "SMST Admin" : "SMST Canindé";
  const description = isAdmin
    ? "Painel administrativo da Secretaria de Segurança de Canindé - Guarda Municipal, DEMUTRAN e programas sociais."
    : "Secretaria de Segurança de Canindé - Trabalhando pela proteção, educação e bem-estar da nossa comunidade através da Guarda Municipal, DEMUTRAN e programas sociais.";

  return {
    name: "html-pwa-transform",
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(
          /<meta name="description" content=".*?"/,
          `<meta name="description" content="${description}"`,
        )
        .replace(
          /<meta name="apple-mobile-web-app-title" content=".*?"/,
          `<meta name="apple-mobile-web-app-title" content="${appName}"`,
        )
        .replace(
          /<meta name="application-name" content=".*?"/,
          `<meta name="application-name" content="${appName}"`,
        );
    },
  };
}

const sharedManifest = {
  theme_color: "#1e40af" as const,
  background_color: "#f6f8fc" as const,
  display: "standalone" as const,
  display_override: ["window-controls-overlay", "standalone", "minimal-ui"] as const,
  orientation: "any" as const,
  lang: "pt-BR" as const,
  scope: "/" as const,
  categories: ["government", "security", "transportation"] as const,
  icons: [
    { src: "pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "pwa-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] as const,
};

const publicManifest = {
  name: "SMST - Secretaria Municipal de Segurança Pública e Trânsito",
  short_name: "SMST Canindé",
  description:
    "Sistema de gestão da Secretaria de Segurança de Canindé - Guarda Municipal, DEMUTRAN e programas sociais.",
  start_url: "/",
  shortcuts: [
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
    {
      name: "Notícias",
      short_name: "Notícias",
      description: "Acompanhar as notícias da secretaria",
      url: "/noticias",
      icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Guarda Municipal",
      short_name: "Guarda",
      description: "Conheça a Guarda Municipal",
      url: "/guarda-municipal",
      icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  ],
};

const adminManifest = {
  name: "SMST Admin - Gestão da Segurança Pública",
  short_name: "SMST Admin",
  description: "Painel administrativo da Secretaria de Segurança de Canindé.",
  start_url: "/admin/login",
  shortcuts: [
    {
      name: "Dashboard",
      short_name: "Dashboard",
      description: "Acessar o painel principal",
      url: "/admin/dashboard",
      icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    },
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
      name: "Fala Cidadão - Admin",
      short_name: "Fala Cidadão",
      description: "Gerenciar solicitações do Fala Cidadão",
      url: "/admin/fala-cidadao",
      icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  ],
};

export default defineConfig(({ mode }) => {
  const isAdminBuild = mode === "admin";

  return {
    base: "/",
    server: {
      host: "127.0.0.1",
      port: 8080,
    },
    build: {
      outDir: isAdminBuild ? "dist-admin" : "dist",
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "favicon.png", "pwa-icon.svg"],
        manifest: {
          ...sharedManifest,
          ...(isAdminBuild ? adminManifest : publicManifest),
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
      htmlPwaTransform(isAdminBuild),
      mode === "development" && componentTagger(),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
