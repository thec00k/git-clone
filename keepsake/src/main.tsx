import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppProvider } from "./store/appStore";
import { NavProvider } from "./store/nav";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <NavProvider>
        <App />
      </NavProvider>
    </AppProvider>
  </StrictMode>,
);

// Offline read mode (production only, so dev HMR is untouched).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline mode unavailable */
    });
  });
}

