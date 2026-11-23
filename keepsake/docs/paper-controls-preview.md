# Paper controls

Two editor controls in the Illustrated Nostalgia paper look. The owner approved them from a preview on November 23, 2026.

- **Paper slip menu** (`src/components/PaperSlipSelect.tsx`): a dropdown whose options spring out of a paper tag as cut-paper slips, with an ink outline and a soft shadow. It is used for occasional choices in the book's Pages menu: "Paper for selected page" and "Paper stock" (`PaperControls`). Avoid it for tools that get clicked all the time.
- **Pressed-flower ink picker** (`src/components/PetalInkPicker.tsx`): paper petals open around a centre button. In the caption toolbar it runs in `compact` mode, where a small button blooms the flower above the toolbar and a paper tag names the hovered ink. The inks are `SHARPIE_INKS` in `src/types/scrapbook.ts`: the five original inks plus mustard, sage and dusty rose. Captions saved with any colour still work. The button shows the saved colour.

Shared pieces are the SVG filters in `PaperFilters.tsx` (paper "goo" merge, cut edge and paper grain; ids are unique per instance) and the styles in `src/paperControls.css`. Both controls support the keyboard (arrows, Enter, Escape, Tab), close when you click elsewhere and respect reduced motion. Escape inside an open control closes only that control, not the Pages menu around it.

Standalone preview: run `npm run dev` and open `/paper-controls-preview.html`. The page is not part of the production build.

`scripts/check-stationery-browser.mjs` now picks page paper through the slip menu instead of a `<select>`.

## Source and licence

The ideas came from the "Gooey Dropdown" and "Blossom Picker" on ui.nexvyn.dev. That library uses MIT plus the Commons Clause, and its components need the `motion` package. No code from it was copied. Both controls were written from scratch with CSS and SVG, and no dependencies were added.
