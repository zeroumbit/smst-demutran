import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

// Recarrega a página automaticamente quando o Service Worker atualiza e assume o controle
let refreshing = false;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "SMST_NOTIFICATION_CLICK") return;
    const url = event.data.url || "/admin/dashboard";
    window.location.assign(url);
  });
}

registerSW({
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa:offline-ready"));
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:need-refresh"));
  },
});

createRoot(document.getElementById("root")!).render(<App />);
