# Safety model

Owner decisions (October 2026): Keepsake is for everyone aged 13+. No likes, streaks or public counts. Teens get protective defaults. This page lists every rule, where it is enforced, and what is still missing. **Have a lawyer review this before any public launch** (COPPA for under-13s, state and UK/EU rules for teens, the NCMEC reporting duty).

## Rules and where they live
| Rule | Enforced by | Tested |
| --- | --- | --- |
| 13+ only; an under-13 birth date is refused and not stored | `complete_signup()` | DB tests |
| New rooms are invite-only | `complete_signup()` | DB tests |
| Under-18s can never open their room to everyone | trigger `enforce_room_rules` | DB tests |
| Birth dates visible only to their owner | `profile_private` policy | DB tests |
| A room's private details (archive, notes, time capsules, preferences) visible only to their owner, even to visitors of an open room | `room_private` policies; `rooms.settings` holds only the room's look | DB tests (sync) |
| A sync never overwrites another device's save or anything on the device | `save_room()` revision check; sync client never writes the room | DB tests (sync), `check-sync` |
| Friends found only by exact username; no search, no suggestions | `find_profile()`; profiles policy | DB tests |
| Only the other person can accept a friend request | trigger `check_friendship` | DB tests |
| Only friends can be invited; invites end with a block | `invites_insert` policy, `after_block` | DB tests |
| Silent blocks: the blocked person can't see the block, the room, the photos, or look the blocker up; friendship, invites and tags end | `blocks` policy, `is_blocked()` in every visibility check, `after_block` | DB tests |
| Nobody can ask about other people's friendships or blocks | `are_friends()`/`is_blocked()` answer only for the caller | DB tests |
| Tags: only friends, only in your own photos, pending until the tagged person accepts | trigger `check_tag`, tag policies | DB tests |
| Guestbook notes start pending; the room owner decides what shows; no notes across blocks or into rooms you can't visit | trigger `check_note`, note policies | DB tests |
| Reports: anyone can file; reporters see only their own; nobody can resolve one except moderators | report policies | DB tests |
| Rate limits per day: 20 notes, 30 reports, 30 friend requests, 60 tags, 200 uploads; 60 lookups an hour | `rate_limit()` in triggers | DB tests (notes) |
| Photos hidden from everyone but the owner until moderation approves | `can_view_photo()`, column grants (owners can't approve) | DB tests |
| Uploads: 25 MB, common image types, 500 per person, resized to 2048 px, all metadata (GPS) removed | app (`src/lib/limits.ts`, `stripMetadata.ts`) and pipeline (`moderate-photo`, `UPLOAD_LIMITS`) | `check-limits`, `check-strip-metadata`, `check-moderation` |
| Moderation decisions: known abuse-imagery hash match removes and escalates; possible minors in sexual context go to urgent human review; anything unchecked is held | `functions/_shared/moderation.ts` | `check-moderation` |
| Signed-out visitors see nothing; no function is callable signed out | grants; guard test | DB tests |

## Still to build before anyone can see anyone else's content
1. **Choose and connect** a hash-matching service (Cloudflare CSAM Scanning Tool, PhotoDNA or Thorn Safer) and an image classifier (Hive, Sightengine, AWS Rekognition or Google SafeSearch). Until then the pipeline holds every upload for review.
2. **Image processing** in the edge function (resize and re-encode to WebP).
3. **NCMEC CyberTipline** registration and the reporting procedure for hash matches; evidence preservation rules (ask the lawyer).
4. **A moderator** (who reviews reports and held photos, how fast) and a simple review screen using the service role.
5. **In-app safety links**: report, block, and help resources (StopBullying.gov, 988 Lifeline, Crisis Text Line, NCMEC Take It Down) reachable from every profile, room and note.
6. **Terms and Privacy** covering age, uploads ("you must have the right to upload this"), moderation, data deletion and export.
7. **Account deletion and export** (deleting the auth user cascades every row; Storage objects need a cleanup job).

## Open owner questions
- May adults send friend requests to teens? Today anyone may send one by exact username; the teen must accept, and their room stays invite-only. A stricter option is to block adult→teen requests unless already connected another way.
- Which holidays appear by region.
- Who handles abuse reports, and in how many hours.
