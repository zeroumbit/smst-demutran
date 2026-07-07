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
}

registerSW({
  onOfflineReady() {
    console.log('App ready for offline use');
  },
});

createRoot(document.getElementById("root")!).render(<App />);
