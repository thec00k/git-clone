import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppProvider } from "./store/appStore";
import { NavProvider } from "./store/nav";

// Spotify forbids `localhost` as a redirect URI. Stay on 127.0.0.1 so the
// PKCE verifier and the OAuth return land on the same origin.
if (window.location.hostname === "localhost") {
  const port = window.location.port ? `:${window.location.port}` : "";
  window.location.replace(
    `http://127.0.0.1${port}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
} else {
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
}

