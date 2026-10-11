# Code map

Where things live, what tests them, and what to check in an audit. Paths are under `keepsake/`.

| Area | Main files | Tests |
| --- | --- | --- |
| App shell, navigation | `src/App.tsx`, `src/store/nav.tsx` | browser checks |
| Room state and saving | `src/store/appStore.tsx` (all state changes), `src/lib/storage.ts` (IndexedDB, files by hash), `src/lib/roomBackup.ts` (backup validation), `src/lib/originalPhotos.ts`, `src/lib/stripMetadata.ts` | `check-storage`, `check-memory-features`, `check-room-themes`, `check-strip-metadata` |
| Limits | `src/lib/limits.ts`, `src/lib/importLimits.ts` | `check-limits`, `check-import-limits` |
| Seasons, holidays, ageing, stamps | `src/lib/seasons.ts`, `src/hooks/useSeasonal.ts`, `src/lib/roomAge.ts`, `src/lib/stamps.ts` | `check-seasons`, `check-room-age`, `check-stamps` |
| Scrapbook editor | `src/components/BookView.tsx`, `ElementView.tsx`, `ScrapbookPage.tsx`, `SelectionToolbar.tsx`, `src/hooks/useScrapbook.ts` (undo, pages, photos), `src/lib/photoBatch.ts`, `src/lib/photoInbox.ts`, `src/lettering.css`, `RansomText.tsx` | `check-editor`, `check-photo-batch`, `check-photo-inbox`, `check-lettering`, book capture |
| Archive, map, shelf, guestbook | `src/components/views/*` | browser checks |
| 3D room | `src/components/room3d/RoomScene3D.tsx` (scene), `RoomModel.tsx` (what is in the room), `RoomCamera.tsx` (camera and walking), `themes.ts` (rooms), `useActiveRoom.ts`, `useRoomAsset.ts`, `HearthFire.tsx`, `HolidayDecor.tsx`, `DustBunnies.tsx`, `WoodlandStudyExterior.tsx` | room screenshots (`ci-shots`) |
| Sound | `src/lib/audio.ts`, `src/lib/fireplaceAudio.ts`, `src/components/room3d/RoomSound.tsx` | none automated |
| Music providers | `src/lib/spotify.ts` (PKCE), `src/lib/soundcloud.ts` | `check-spotify`, `check-soundcloud` |
| Security headers | `public/_headers` | `check-security-headers` |
| Backend (not deployed) | `supabase/migrations/*.sql`, `supabase/functions/` | `supabase/tests/run.sh` (CI database job), `check-moderation` |
| Assets and licences | `public/`, `art/`, `licences/ledger.json` | `check-licences`, `check-asset-credits` |

## Audit checklist
1. **Data loss:** every state change goes through `appStore`; saves are serialized and revision-checked; restore cannot be overwritten by an older autosave; undo only touches pages and the waiting pile.
2. **Backups:** anything the app can create must restore (`roomBackup.ts` limits never stricter than the UI's).
3. **Privacy:** no location or metadata kept; nothing leaves the device except Spotify/SoundCloud embeds; birth dates private on the server.
4. **Server permissions:** run `npm run check:db`; any new table has RLS and a test; security definer functions pin `search_path`.
5. **3D leaks:** materials, geometries and textures created in `useMemo` are disposed; no allocations inside `useFrame`.
6. **Input:** keyboard handlers ignore text fields and open dialogs; reduced motion respected.
7. **Assets:** `npm run check:licences` and read `docs/licence-report.md`.
8. **CI:** workflows keep `persist-credentials: false` where third-party installs run with write permission.
