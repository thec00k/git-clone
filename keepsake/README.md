# Keepsake

A calm, tactile **digital scrapbook** — open the book, add your photographs,
arrange them like real prints, and revisit small days. This is the Phase A→B
scrapbook prototype from the *Keepsake Vision & Design Bible v3.0*, rendered in
the cozy, handcrafted "room" aesthetic (warm palette, Fraunces + Caveat type,
paper / leather / polaroid / tape materials).

## What it does

The core solo memory loop, scrapbook-first (per the Bible's priority order —
photographs → scrapbook → organization first):

- **Cover → open**: a leather-bound book on a wooden desk; open it into a
  two-page spread.
- **Add photographs**: upload images (downscaled locally); they land as
  polaroid / taped / flush prints, up to 6 per page.
- **Arrange like prints**: select, drag, rotate, resize, restack (bring
  forward / send back), change frame, replace, and remove.
- **Handwritten captions**: add and edit captions inline in a handwriting font
  (short, character-limited), with sharpie ink colours.
- **Layout presets**: one-tap **Grid / Column / Scatter** arrangements for fast
  users, alongside full freeform placement for those who enjoy the craft.
- **Tactile page turns**: a directional 3D page-flip animation across the spine
  (buttons or ← / → keys), with a reduced-motion fallback that swaps instantly.
- **Multi-page book**: add and delete spreads.
- **It remembers**: the whole book (layout, captions, and photos) autosaves to
  **IndexedDB**, so it survives a refresh.

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4, lucide-react icons. No backend —
state lives in the browser (IndexedDB), matching the Bible's "prove the
scrapbook experience first" prototype stage.

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:5174  (Spotify rejects localhost as a redirect URI)
npm run build    # typecheck (tsc -b) + production build
npm run preview  # preview the production build
```

## Layout

```
src/
  components/    RoomFrame, BookCover, Spread, ScrapbookPage,
                 ElementView, SelectionToolbar, SaveIndicator
  hooks/         useScrapbook (state + autosave), usePointerDrag
  lib/           id, clamp, image (downscale), storage (IndexedDB)
  data/          seed (starter book)
  types/         scrapbook (Scrapbook → Page → PageElement)
```

## Not built yet (intentionally — later Bible phases)

The 3D room, bookshelf, filing cabinet, accounts / privacy, social visiting,
achievements, music, printing, and offline sync are deliberately out of scope
until the solo scrapbook loop is stable and satisfying.
