import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Map a non-VITE secret name onto the public Client ID only.
// Never forward SPOTIFY_CLIENT_SECRET — PKCE must not ship it to the browser.
const spotifyClientId =
  process.env.VITE_SPOTIFY_CLIENT_ID?.trim() || process.env.SPOTIFY_CLIENT_ID?.trim() || ""

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: { plugins: [] },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    // Local-only by default. For a trusted tunnel, explicitly add its hostname
    // with __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS; never allow all hosts.
    allowedHosts: [],
  },
  define: spotifyClientId
    ? { "import.meta.env.VITE_SPOTIFY_CLIENT_ID": JSON.stringify(spotifyClientId) }
    : {},
})
