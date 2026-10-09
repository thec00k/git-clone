# Scanner model budget and privacy rules

Updated 2026-10-09 on `codex/scanner-texture-pipeline`. Applies to phone scans and any other GLB imported into Keepsake binders or the display case.

## Principles

- **Private by default.** Scans are made on the phone, sent only to the user's own desktop, and stored in the browser. No cloud reconstruction service, analytics or upload is part of this pipeline.
- **The room does not pay for scans.** A scan renders only in the single inspection viewer (`BinderScan`): demand-driven frames, capped pixel ratio, and geometry/textures disposed on close. A budget keeps each scan small enough that opening one cannot slow the room.
- **Never lose kept memories.** Tightening limits must not stop an existing backup from restoring.

## Budget enforced today

One module, `src/lib/glbBudget.ts` (`GLB_BUDGET`), is the source of truth. The browser importer and the desktop receiver both call `inspectGlb`, so a scan that would be refused on import is refused at transfer and never written to disk.

| Limit | Value | Notes |
| --- | --- | --- |
| File size | 5 MB | unchanged |
| Triangles | 50,000 | unchanged. The Swift scanner targets 45,000 for headroom |
| Nodes | 200 | unchanged |
| Mesh parts (primitives) | 16 | new; each is a draw call |
| Materials | 8 | new |
| Images | 4 | unchanged |
| Texture side | 2048 px | new |
| Texture pixels, total | 4,194,304 | new: one 2048x2048 atlas or four 1024x1024. About 22 MB of GPU memory with mipmaps |
| Texture format | PNG or JPEG, embedded | new: WebP and anything else is refused. No `uri` references, no required extensions |

Image sizes are read from PNG/JPEG headers; nothing is decoded to check them.

**Backups.** `parseRoomBackup` validates saved scans with `strict: false`, which skips only the four new limits (parts, materials, texture size, texture pixels). A model saved before this change still restores. Network references and required extensions are still refused on restore.

**Display case.** `ArtifactDisplayCase` uses the strict budget for new models.

## Proposed, not enforced: stricter budget for scans placed in the room

The binder budget above is for an inspection viewer. When scans are shown in the room itself (display case, always rendered), a tighter tier is likely needed. Suggested starting point for the owner to confirm and for measurement to tune: at most about 20,000 triangles, one texture no larger than 1024x1024 (or vertex colours only), and about 2 MB. This needs profiling in the room before it becomes a rule.

## Known gaps

- The receiver's pairing and read access are not secure enough for use beyond a trusted home network. See [scanner-opus-handoff.md](scanner-opus-handoff.md).
- Scans are stored in app state as base64 data URLs (about 4/3 of file size) and every binder keeps up to nine. This was not changed.
- `scripts/check-scan-budget.mjs` guards the Swift triangle constant against drifting past the importer's limit. Nothing else in the Swift app is covered by automated tests, and the Swift code could not be compiled in the authoring environment.

## Checks

```sh
npm run check:scans        # budget + receiver (also part of check:acceptance)
node scripts/check-card-binders.mjs
```
