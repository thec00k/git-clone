# Changes made to the vendored skills

Everything else is a byte-for-byte copy of the source commit named in each `SOURCE.txt`.

- `threejs-aaa-graphics-builder/SKILL.md`: added a "Keepsake note" block after the frontmatter saying the paid generators, director and scaffold are not installed. Its body still mentions them; the note overrides that.
- `motion-camera`, `motion-depth`, `motion-3d-transforms`, `motion-rotation`, `motion-reflection` (from motion-design-agent `camera`, `depth`, `3d-transforms`, `rotation`, `reflection`): `name:` in the frontmatter renamed with a `motion-` prefix; the "Load from tokens/..." line now points to a `tokens.json` copied into each folder (from `tokens/camera|depth|rotation|reflection.tokens.json`; `motion-3d-transforms` uses `depth.tokens.json`, as the original does).
- `ponytail*` (from DietrichGebert/ponytail): no edits. Only the six `skills/*/SKILL.md` files are copied; the plugin's hooks (session auto-activation, level tracking, status band) are not, so `ponytail-help`'s band and auto-update sections do not apply.
