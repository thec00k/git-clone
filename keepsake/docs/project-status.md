# Keepsake — current project checklist

Updated September 7, 2026. This is the authoritative implementation checklist. The prototype notes, worklog PDFs and earlier suggestions are historical records; later entries may supersede earlier ones.

## Product direction

Desktop first, then tablet, then phone. A local Woodland prototype precedes cloud and quiet social features. Photographs first, scrapbook second, room third, social fourth. First-person navigation; no avatars or popularity mechanics.

Art direction: 35% Edith Finch, 25% LittleBigPlanet, 20% Life is Strange, 10% Sly Cooper, 10% inFAMOUS Second Son, interpreted through original assets and consistent handmade materials.

## 1. Woodland acceptance

Implemented and covered by automated checks:
- [x] Optimized room asset, 16 anchors, furniture contact and ceiling-chain clearance.
- [x] Four/six-photo arrangement with mixed proportions and obstacle preservation.
- [x] Room backup round trip, malformed data rejection and spread reordering.
- [x] Persistent discoveries, cooldowns, story order, rewards, guest-note preferences and placement bounds.
- [x] Shop ownership, duplicate purchase protection, balance checks and independent decoration slots.
- [x] Music entry preferences, six CRT colors and public SoundCloud URL validation.
- [x] Spotify volume/device error handling with simulated HTTP responses.
- [x] One fail-fast command for all of these: npm run check:acceptance.

Previously browser-verified: scrapbook cover editing and shelf selection; printer destinations; spread overview and undo; backup restore on an isolated origin; correspondence persistence; music controls and automatic playlist progression; seated/editor drawer access. These checks do not establish full device coverage.

Current acceptance work:
- [x] Correct settings focus traversal to exclude collapsed/hidden controls and include section headings.
- [x] Stabilize the editor page dependency to remove repeated callback dependency warnings.
- [x] Browser-check Settings initial focus, Tab wrapping and Escape focus restoration; seated drawer access and all five planned room cards.
- [ ] Complete remaining keyboard navigation and reduced-motion browser checks.
- [ ] Review day/dusk/night, weather, season and quality combinations visually.
- [ ] Validate representative desktop hardware at 1080p with a single active room tab.
- [ ] Run actual VoiceOver/TalkBack and tablet/phone checks.
- [ ] Resolve remaining actionable React warnings; large 3D bundle warning remains.
- [ ] Verify long-session saving, storage exhaustion and recovery behavior.

Latest automated checks passed September 7. Performance observations in woodland-prototype.md are not hardware certification. Sandbox repair is no longer a known browser-testing blocker.

## 2. Contrasting second room: Beachfront

All environments belong in this repository and share product systems. Development branches are temporary, not user-selectable rooms.

- [x] First playable Beachfront shell, coastal exterior, materials and synthesized surf; further art polish remains.
- [ ] Generalize theme configuration beyond the existing Woodland/classic asset choice: lighting, scenery, functional anchors, camera views and decoration slots.
- [x] Add an owner style preview and Make this my room action under Drawer > Room Variants.
- [x] Persist the selected room and each room's decoration arrangement.
- [x] Load and validate the requested asset before changing the selected environment; retain the old selection on load failure.
- [ ] Verify switching and reloading preserves all books, photos, pins, guest messages, inventory and achievements. Unsupported display items remain in inventory.

Planned lineup: Woodland Writing Room (built), Beachfront (first playable slice), Cyberpunk Cityscape, Snowy Mountain, Stormy Lighthouse Room. The lighthouse replaces the original Stormwatch Library concept: stormy sea views, curved coastal architecture, rain-streaked glass, aged brass and warm lantern light. Woodland and Beachfront can be selected without a stamp charge. The other three shop cards remain planned. See [Beachfront implementation notes](beachfront-prototype.md).

## 3. Reliable cloud saving and photo ownership

Not implemented. Requires a configured backend and hosting environment.

- [ ] Accounts, signed-in room ownership and server-enforced access rules.
- [ ] Private originals, optimized derivatives, upload validation and metadata handling.
- [ ] Local-to-cloud migration, offline retry, conflict handling and recovery history.
- [ ] Cross-device save/restore tests, account deletion and export.
- [ ] Production deployment and provider redirect configuration.

## 4. Invitations and shared scrapbooks

Not implemented. Existing View as and guestbook behavior are local demonstrations, not authorization or cross-device delivery.

- [ ] Close friends may enter under owner settings; others require invitations by default.
- [ ] Owner/editor/viewer book roles enforced by the server.
- [ ] Shared edits, conflict handling, version recovery and matching photo permissions.
- [ ] Guest notes, moderation, blocking/reporting and optional quiet presence.
- [ ] Visitor theme-song preferences without sharing provider credentials.
- [ ] Full SoundCloud account connection using registered credentials and server-side token exchange.

## Remaining refinements

Milestone-based stamp earnings; camera restoration after editing; music fades and clearer provider errors. These follow the ordered work above unless reprioritized.

## Saving and verification

The app and Blender source are versioned on codex/keepsake-rebuild. The user confirmed the GitHub destination, and the saved build through 11b6c79 was successfully pushed to both origin/codex/keepsake-rebuild and origin/main on September 7. Acceptance changes are saved in the subsequent checkpoint.

Run from keepsake/: npm run check:acceptance, npm run build, npm run lint. Lint currently reports warnings. Browser checks must preserve user data; never reset the personal 5174 origin to install test fixtures.

## Latest checkpoint

Woodland demo: `art/demos/woodland-room-demo.mp4` is a three-minute, 1920 x 1080 walkthrough with synthetic narration, chapter cards, embedded English subtitles, and 12 chapter markers. The adjacent Markdown transcript and SRT can be used independently. It covers atmosphere, scrapbooks, photo batches, markers, shelf books, printing, friend-note preview, music, shop, guestbook, and backups. Capture uses fresh sample data on an isolated browser origin; online social features are explicitly described as future work. Recording intermediates are excluded from Git and the development file watcher.

September 7 friend sticky-note pass:
- The scrapbook's Notes on/off button shows an inline rail for the current spread, preserving page navigation and editing while notes are visible.
- Owners opt in under Room settings > Notes & discoveries. Friends and close friends can then open books marked Friends or Public on the desk, shelf, and linked map pages. Private books stay private.
- New sticky notes are limited to 20 Unicode code points in both the editor and store, and wait for owner approval. Existing longer notes remain intact. Public visitors cannot post.
- These remain local role previews; authenticated relationships and server-side authorization belong to the future social backend.

Validation: the full acceptance suite and production build pass. A fresh Edge profile verified the toggle, keyboard page navigation, note preservation, input limit, pending-note visibility, public posting rejection, and owner opt-out. Personal browser data was not altered.

September 7 reliability and settings pass:
- Development server defaults to loopback and rejects arbitrary Host headers. Trusted tunnel hosts must be explicitly allowlisted; LAN testing requires an explicit host option.
- IndexedDB v3 migrates inline photographs into a separate deduplicated image store while keeping exported backups portable. Missing images and read errors block startup and offer retry; they never trigger replacement demo data.
- Writes are serialized per tab and checked against an atomic saved revision. A stale tab stops saving and offers an unsaved-room download before reloading. Pending changes flush when hidden; browser exit requests confirmation while unsaved. These improve normal closing behavior, but cannot guarantee writes during forced termination or storage failure.
- Undo retains immutable book versions instead of deep-copying their image data. Folder imports now cap batches at 100 files / 200 MB, each image at 25 MB / 50 megapixels, check available storage, and support stopping after the current image. Photo chooser retains its 20-photo limit. Already imported photos remain when an import is stopped.
- Page overview shares the actual ink renderer and honors square photo crops.
- One Room settings dialog contains Appearance & graphics, Music & CRT, Notes & discoveries, Saving & storage, and Help & profile. Window/CRT interactions open the corresponding section. Both graphics options remain user-facing and saved; Balanced water uses 32 x 48 segments, High uses 96 x 128.

Validation: acceptance checks, import-limit tests, production build, and desktop/390px settings layout checks. Native browser tests live in scripts/check-storage-browser.mjs (npm run check:storage): start an isolated server on 127.0.0.1:5178 and provide Playwright through PLAYWRIGHT_MODULE plus optional TEST_BROWSER executable. Tests use fresh temporary browser profiles; never seed personal review origins. The suite covers old-save migration, image deduplication/hydration, stale-write rejection, failed reads, missing images, settings persistence, import/undo/thumbnail behavior, and recovery UI. Physically tested phone/GPU performance and live provider account testing remain separate acceptance work.


September 7 scrapbook import and drawing update: the final next-page arrow becomes an Add new page (+) control. Add photo opens a device/cabinet chooser with a 20-photo limit and reorderable preview; batches place four equal square frames per page, preserve existing content, and undo as one operation. Uncropped archive images remain available. Folder upload creates a named cabinet category and reports unreadable files. The blue marker and a conditional thickness slider are available; each stroke preserves its width. A single photo added to a full page is placed on a fresh page.

Validation: automated acceptance checks and production build passed. A fresh headless Edge profile on isolated port 5178 verified 20-photo/five-page layout, square frames, undo/redo, blue stroke color and saved width, cabinet selection, end-page addition, and a renamed folder import containing two images plus one unsupported file. Personal room data was not changed. Mobile folder-picker support remains device dependent.

Door actions are implemented: save-and-close local logout, non-destructive tidy with save result, and an honest friends-room landing screen pending real visits. Beachfront is a playable first slice with the requested pale woods/blue trims, arched window, preserved desk clutter, sunset, moonlit water, rocks and exclusive Coastal Blue CRT preset. Switching and exclusive-color ownership have automated regression coverage; dusk/night and switching both ways were checked in the browser. Further visual and device acceptance remains open.
