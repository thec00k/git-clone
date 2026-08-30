import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Map a non-VITE secret name onto the public Client ID only.
// Never forward SPOTIFY_CLIENT_SECRET — PKCE must not ship it to the browser.
const spotifyClientId =
  process.env.VITE_SPOTIFY_CLIENT_ID?.trim() || process.env.SPOTIFY_CLIENT_ID?.trim() || ""

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5174,
  },
  define: spotifyClientId
    ? { "import.meta.env.VITE_SPOTIFY_CLIENT_ID": JSON.stringify(spotifyClientId) }
    : {},
})
