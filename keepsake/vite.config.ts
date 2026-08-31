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
    host: true,
    port: 5174,
    // Cursor Cloud forwards this port on a *.cursorvm.com host; Vite 6+
    // blocks unknown Host headers unless we allow them. Local Spotify
    // testing still uses http://127.0.0.1:5174/ typed in the browser.
    allowedHosts: true,
  },
  define: spotifyClientId
    ? { "import.meta.env.VITE_SPOTIFY_CLIENT_ID": JSON.stringify(spotifyClientId) }
    : {},
})
