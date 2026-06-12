import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./tokens.css";
import App from "./App";
import { requestPersistence } from "./lib/db";
import { startSyncLoop } from "./lib/sync";

// Best-effort eviction protection (supplements cloud sync, never replaces it).
void requestPersistence();
// Background sync: drains the outbox on connectivity/focus/login.
startSyncLoop();

// Service worker: offline shell + (v1.1) push display.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
