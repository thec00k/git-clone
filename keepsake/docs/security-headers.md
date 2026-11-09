# Security headers and third-party requests

Added 2026-10-10 on `codex/foundations-and-seasons`.

## What the app asks other sites for
Nothing at page load. Fonts are self-hosted (`public/fonts`, `src/fonts.css`), so visitors' addresses are no longer sent to Google. Other hosts are contacted only when a user uses an optional feature:

| Host | When |
| --- | --- |
| `open.spotify.com`, `api.spotify.com`, `accounts.spotify.com`, `sdk.scdn.co` | Spotify embed or sign-in |
| `w.soundcloud.com`, `*.sndcdn.com` | SoundCloud player |
| `127.0.0.1` / `localhost` | Importing a phone scan from the user's own computer |

The CSP in `public/_headers` lists exactly these. `scripts/check-security-headers.mjs` fails if the page, the stylesheet or the headers file mention any other host.

## Enforced
Since November 9, 2026 the policy is enforced (`Content-Security-Policy`). The built app was loaded under it in Chromium with no violations. Spotify and SoundCloud could not be reached from the build machine, so check them once on the hosted site: if one stops playing, the browser console names the blocked address to add. `frame-src` includes `sdk.scdn.co` because the Spotify playback SDK runs in an iframe from there. Importing a phone scan works at `http://127.0.0.1` or `localhost` (the receiver runs on the same computer); a LAN address typed into the app is blocked. Known compromise: `style-src 'unsafe-inline'` because React sets inline styles.

The Supabase API (`https://*.supabase.co`, `wss://*.supabase.co`) is in `connect-src` for account sign-in and backup; it is only contacted once someone signs in. Add it to `img-src` when visiting a friend shows server photos.

## Permissions the app does not use
The app never uses location, camera, microphone or notifications (no code references them). `Permissions-Policy` switches them off, which also backs the rule that Keepsake never reads photo or user location.

## Hosting
`_headers` is read by Cloudflare Pages and Netlify. Other hosts need the same headers set in their own configuration. Hosting is not decided yet.
