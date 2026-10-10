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

## Report-only for now
The policy is sent as `Content-Security-Policy-Report-Only`. Switch it to enforcing once a hosted build has run through Spotify, SoundCloud and scan import without reports. Known compromise: `style-src 'unsafe-inline'` because React sets inline styles.

When the backend arrives, add its origin to `connect-src` and `img-src`.

## Permissions the app does not use
The app never uses location, camera, microphone or notifications (no code references them). `Permissions-Policy` switches them off, which also backs the rule that Keepsake never reads photo or user location.

## Hosting
`_headers` is read by Cloudflare Pages and Netlify. Other hosts need the same headers set in their own configuration. Hosting is not decided yet.
