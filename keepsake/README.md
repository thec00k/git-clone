# Keepsake

A calm, tactile **digital scrapbook** in a handcrafted room: sit at the oak
desk, open the book, pin prints, and wander the house. Prototype of the
*Keepsake Vision & Design Bible v3.0* (cream plaster, honey oak, terracotta,
Fraunces + Caveat).

The Bible PDF is **not** in this repo. Nearby docs are
[`docs/keepsake-worklog.pdf`](docs/keepsake-worklog.pdf) and
[`docs/keepsake-suggestions.pdf`](docs/keepsake-suggestions.pdf).

## Woodland rebuild — current branch

The first Woodland Writing Room slice is implemented with a modular 3D architecture, seasonal forest scenery, rain/snow, quality controls, and a remodeled stitched beanbag. The working scrapbook editor and local storage are preserved. See [prototype notes and remaining acceptance checks](docs/woodland-prototype.md) and [asset provenance](art/woodland/asset-ledger.json).

The default room is `public/room/woodland/woodland.glb`; use `?theme=classic` for the previous asset. Blender source: `art/woodland/woodland.blend`. Validate an export with `npm run check:room`. Browser acceptance is pending a Windows sandbox repair; Blender inspection, build and GLB validation have been completed.

## Original baseline

The room is a WebGL scene from [`public/room/keepsake.glb`](public/room/keepsake.glb)
(desk, chair, CRT, lamp, archive, shelf, map, guestbook, door, fan, clock,
window). Click a named prop to open that system. Sit in the chair, walk with
WASD / arrows, look with the mouse, zoom with the wheel.

### Scrapbook

- Leather book on the desk → two-page spread on the oak
- Upload photos (downscaled locally); polaroid / tape / flush frames; up to 6 per page
- Drag, rotate, resize, restack, replace, remove; corner handles; pinch/twist on touch
- Handwritten captions (short, character-limited) and desk-marker ink
- Stickers; Grid / Column / Scatter presets
- Page-turn across the spine (buttons or ← / →), with a rustle; reduced-motion swaps instantly
- Undo / redo; `?` shortcuts
- Print / Save as PDF
- Autosave to **IndexedDB** (book, layout, photos, room settings)

### The house

- **Window** — day / dusk / night (auto or forced), season, weather
- **Lamp** — click the fixture; **ceiling** — plate left of the window
- **Clock** — rolling digits on `ks_clock_digits` (live in Auto; still times for day/dusk/night)
- **CRT** — ambient pad and optional **Spotify** (PKCE; Client ID only, never the secret)
- **Bookshelf** — multiple books, covers, titles, visibility
- **Archive** — cabinet drawer → hanging files → albums, favourites, place-in-book
- **Desk drawer** — sticker packs (while seated)
- **Corkboard map** — pins and notes (no exact GPS)
- **Guestbook** — flat notes; page notes wait for owner approval, then can whisper
- **Door** — leave or tidy
- First-visit house tour (skippable); hidden “keepsakes found”; curator ambience
- `?listen=1` — spoken room for VoiceOver / TalkBack

### Local only

There is **no backend**. “View as” (owner / close / friend / public) is a
preview, not security. Visibility, visiting, and notes are UI-only. Photos are
data URLs in IndexedDB.

## Left to build

**Product / Bible (needs a server)**

- Accounts, auth, cloud photo storage, real multi-user visiting
- Server-side permission inheritance (Bible §17) before any real sharing
- Hosted production URL (and Spotify redirect URIs for it)

**Room / art**

- The Design Bible file itself (upload or add under `docs/` if you want it in git)
- Optional locators still empty: `ks_window_sun`, `ks_ceiling_fan_light`
- Fan blades do not spin as a separate `ks_ceiling_fan_blades` clip yet
- Further Blender polish (materials, lighting, props) — export the whole scene
  to `public/room/keepsake.glb`, +Y Up, tangents off unless you use normal maps

**Editor / house**

- Timeline wall was removed on purpose; do not treat it as missing
- Licensed sticker / craft packs beyond the starter drawer
- Spotify Web Playback SDK in-app control (Premium + Client ID)
- A real-device VoiceOver / TalkBack pass beyond the first a11y cut
- Physical print / hardware (software PDF is in)

**Fallbacks**

- `?room=flat` — original single-wall diorama
- `?room=chamber` — CSS three-wall room  
  Default is the GLB.

## Run

From this folder (`keepsake/`):

```bash
npm install
npm run dev      # http://127.0.0.1:5174  (Spotify rejects localhost as a redirect URI)
npm run build    # typecheck (tsc -b) + production build
npm run preview
```

Brave: open `http://127.0.0.1:5174/` then hard-refresh (**Ctrl+Shift+R**) after a
new `keepsake.glb`. Copy `.env.example` to `.env` for `VITE_SPOTIFY_CLIENT_ID`
only — never `SPOTIFY_CLIENT_SECRET`.

Debug views: `?look=desk` (overhead oak), `?time=day|dusk|night`, `?tour=1`.

## Stack

React 19 + TypeScript + Vite 8, Tailwind CSS v4, Three.js + React Three Fiber /
Drei, lucide-react. Service worker + web manifest for a production install /
offline shell.

## Layout

```
public/room/keepsake.glb   Blender room (meshes parented to ks_* / Desk)
src/components/room3d/     WebGL room, clock, WebGL fallback
src/components/room/       Hub chrome, tour, window panel, listen
src/components/views/      Shelf, archive drawer/files, atlas, guestbook
src/components/            Book editor, clutter, print, Spotify dock
src/store/                 App state + IndexedDB autosave, nav, listen
src/lib/                   Hotspots, tour, Spotify PKCE, stickers, clock
```
