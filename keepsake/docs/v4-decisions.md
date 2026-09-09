# September 9 v4 decisions

- Keep stamp currency as an intentional exception to Bible v4. Cosmetic purchases do not complete achievements.
- Add Firewatch as a lighting/environment reference with higher priority than inFAMOUS Second Son. Retain Edith Finch, LittleBigPlanet, Life is Strange and Sly Cooper.
- Keep existing music providers and selections. Plan optional theme-specific lo-fi playlists, with source/licensing checks before adding tracks.
- Bookshelf: curated displayed books, searchable full library, and reversible archiving. Search results use the existing cover-to-desk sequence. User approved this direction; implementation remains pending.
- Time capsule: one small theme-matched chest in the right corner containing multiple dated envelopes. Verify cabinet/shelf/walking clearances before modeling. Woodland oak/brass; Beachfront pale teak/sea-glass are proposed materials, not approved final models.
- Original preservation approved: keep source files by default, with a display-only option for future uploads. No original can be reconstructed from an old resized upload.

## Requested follow-on systems

Memory lighting, room sound geography, Found Photos, offline support, Memory Trails, and AI Ticket Companion are authorized. Initial local versions are implemented below. The user approved editable commemorative templates first, with AI generation after backend setup. Do not label the template generator as AI.

## Implementation sequence

Original preservation and backup migrations; photo backs/artifact foundation; Then & Now; shared event controls and Lights Out; cloud saving and privacy; further memory/social systems. Backend deployment needs a selected service configuration; local demonstrations must not claim server-enforced protection.

Then & Now has an initial editor preset: exactly two photographs on a non-title page, square side-by-side representations, editable Then/Now captions, existing undo support. It refuses unrelated writing/decorations rather than overwriting them. Dedicated date metadata and pair selection remain later refinements.

## Original preservation checkpoint

Source bytes are stored separately in IndexedDB, keyed by SHA-256; normal room state carries only metadata. Import paths include archive, folder, batch chooser, printer, replacement and map uploads. The archive offers original download. Portable JSON backups include source files and verify their digest on restore. Existing backup files remain supported. The current 250 MB JSON backup limit remains a prototype limitation; large-library/streamed backups should be completed before users import extensive original libraries. Originals retained by canceled imports are deduplicated but automatic unreferenced-file cleanup is not implemented. This is browser-local preservation, not cloud backup.

## Memory systems checkpoint — September 9

- Memory lighting: optional, manually assigned book mood lightly tints window illumination while editing/reading. It does not change time/weather or turn a switched-off light back on. Per-photo profiles and contextual ambience remain later work.
- Sound geography: optional exterior ambience gain follows front/side views and reading; gain changes fade. This first pass does not spatialize Spotify/SoundCloud or place every sound source in 3D.
- Found Photos: archive envelope, up to three new-import photographs untouched for 30 days, 30-day offer cooldown, persistent dismissal, opt-out. Previously used, favorited, categorized, printed or pinned photos are excluded even after removal. Legacy imports without known activity history are excluded. This is an archive presentation, not a new modeled envelope in the room.
- Memory Trails: up to five manual book-to-book links with visibility filtering, removal and persistent storage. Page/photo/artifact targets and semantic suggestions remain later work.
- Ticket companion: editable event/venue/date fields, two paper styles, preview and archive save. The generated image and metadata explicitly identify a commemorative template. No barcode, Wallet access, external research or AI generation is claimed.
- Offline preparation: production-only current-room resources and local-book photographs cached for disconnected reload. API routes bypass caching. Online music remains online; local synthesized ambience remains available. This is local offline use, not authenticated offline entitlement management or cross-device synchronization.

Validation: production build, full existing acceptance, new original-byte/backup browser tests, memory-feature UI/reload tests and deterministic rediscovery checks pass. Production disconnected reload passed after correcting static-asset Vary-header matching. The disconnected reload also passed the stronger scene-hotspot readiness check. Source Blender scenes were not edited by this pass.

Still pending from the broader approved plan: photo backs, generic artifact representations, searchable/curated bookshelf UI, capsule chest modeling and unlock workflow, unified event arbitration/Lights Out, cloud saving and permissions, theme playlist curation and later AI generation.
