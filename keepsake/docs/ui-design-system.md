# Keepsake interface system

Figma: https://www.figma.com/design/5RwG3LC2YWU3QOcJ8DTUe9

The shared UI uses room-colored panels, paper selected actions, accent focus rings,
8px control corners, and 44px minimum button targets. Inter handles control labels;
room headings retain a quieter editorial character. Woodland uses medium Fraunces,
Beachfront regular Fraunces, Cyberpunk Inter, and the mountain/lighthouse themes
use different Georgia weights. These styles do not change authored scrapbook text.

Room menu: Places / Collections / Atmosphere. Settings: Room / Sound / Privacy /
Storage / Help. Light switches live in Atmosphere rather than being duplicated in
settings. Graphics explanations expand on demand. Existing features and data remain.

Implementation: `src/ui-theme.css`, `components/UiSwitch.tsx`. Fonts have system
fallbacks when offline. Future room palettes already have CSS tokens and Figma swatches.

Figma ledger:
- Tokens: VariableCollectionId:5:2 (primitive aliases, three colors per room)
- Buttons page: 6:2; component set: 6:11; default/selected/disabled/focus states
- Room foundations and switch specimens page: 7:2; board: 7:3
- Text styles: Keepsake/Body, Keepsake/Label, Keepsake/Heading

Validation: production build and acceptance suite; `scripts/check-ui-theme.mjs`
exercises both built rooms, keyboard switches, settings navigation, Escape, and
mobile overflow. Browser screenshots are local under art/demo-work/ui-*.
