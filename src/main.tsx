import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    const event = new CustomEvent('pwa:need-refresh');
    window.dispatchEvent(event);
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
});

createRoot(document.getElementById("root")!).render(<App />);
