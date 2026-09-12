# Time capsules and room lighting

- Room / Collections opens Time capsule in place of Letters and keepsakes. Existing discovered letters remain stored.
- Capsules accept up to 20 processed device images or filing-cabinet photos, with title and local opening date. Sealed copies survive source-photo removal, reload, and room backups. They use the device clock, not server-enforced locking.
- Room / Atmosphere exposes the existing persistent bookshelf lighting preference.
- Shelf wash sources have finite 0.39 m reach, above the floor. This prevents the former unshadowed area-light spill in Balanced as well as High mode.
- Display-case LEDs use saturated counterparts of the CRT hues instead of the near-white text ink.

Validation: application build and acceptance suite pass. Targeted capsule backup validation rejects invalid dates, early opened timestamps, empty collections, and unsafe photo URLs. Browser check verifies bookshelf toggle, cabinet-photo selection, sealing, disabled early opening, and reload persistence. Blender shelf and cabinet bounds inspected through MCP. Nighttime browser screenshots reviewed. Browser logs still report an existing React loading-state warning in ArtifactDisplayCase and blocked external media in the isolated test context.

Chest requested separately: Tripo generation is waiting for user browser authorization. Intended fit is a small chest to the right of the file cabinet near the window, approximately 0.55 m wide, 0.38 m deep and 0.40 m tall. No chest asset is represented as complete yet.
