# Paper controls preview (design study)

Open `/paper-controls-preview.html` with `npm run dev`. It is a standalone page,
like `material-study.html`: it is not part of the production build and is not
connected to scrapbook data, the editor, or the photo review stack.

It tries two controls in the Illustrated Nostalgia paper look:

- **Paper slip menu**: a dropdown whose options slide out of a paper tag as
  separate slips, with cut edges, an ink outline and a soft shadow (one SVG
  filter, `#ks-paper-goo`).
- **Pressed-flower ink picker**: a colour picker whose petals open around a
  centre button. It uses the existing caption inks (`SHARPIE_COLORS`) plus
  mustard, sage and dusty rose.

Both work with a keyboard and respect reduced motion.

## Source and licence

The ideas came from the "Gooey Dropdown" and "Blossom Picker" on
ui.nexvyn.dev. That library uses MIT plus the Commons Clause, and its
components need the `motion` package. Keepsake does not use `motion`, so no
code from the library was copied. Both controls were written from scratch
with CSS and SVG, and no dependencies were added.
