# Keepsake motion guide (one page)

Feel: a quiet room with warm paper in it. Things move the way a person moves them: they start gently, glide, and land softly. Nothing bounces, snaps, shakes or pulses for attention. Where this guide and the motion-design skill disagree, the art direction (`art-direction/woodland-camera-book.md`) and `v4-decisions.md` win. The skill's "playful" overshoot and "dramatic reveal" advice are not used here.

## Standard durations

| Kind of motion | Time | Where it already lives |
| --- | --- | --- |
| Press or hover feedback | 120 to 160 ms | `.ks-sticker-lift`, button transitions in `index.css` |
| Small panel, card or caption appearing | 200 to 280 ms | `index.css` (280 ms fades, 240 ms lifts) |
| Speech bubble, dialog, menu | 300 to 420 ms | `ks-say-in` (420 ms) |
| Camera move between desk, corkboard (memory wall) and bookshelf | 650 ms | `CAMERA_MOVE_SECONDS` in `src/lib/motion.ts` |
| Flat page turn, chamber yaw | 820 ms | `ks-flip-*`, `.ks-yaw`, `YAW_MS` |
| 3D page turn, book arriving, opening, leaving | 850 to 1200 ms | `WorkbenchBook.tsx`, `WORKBENCH_DURATION` |

Rule of thumb: the more of the screen it changes, the longer it takes, but nothing a visitor waits on is longer than about a second. Entrances take a little longer than exits.

## Easing

- Default: gentle start, long soft landing, no overshoot. In CSS use `--ease-out` or `--ease-smooth-out` (`index.css`), or the page-turn curve `cubic-bezier(0.42, 0.12, 0.2, 1)`.
- Moves across the room (camera, the 3D page leaf) use the smoother-step curve (`smootherstep` in `src/lib/workbench.ts`, also exported as `cameraMoveEase`). Both ends are slow, so the move never starts or stops with a jolt.
- Small follow-the-target nudges in 3D (lights, props) use `motionFactor` and `MOTION` in `src/lib/motion.ts`.
- Looping ambience (steam, moths, motes, lamp flicker) is slow and uses sine-like or linear timing. It never loops fast enough to draw the eye.

## What moves, and what stays still

Moves: the camera when the visitor asks for another view; the turning page; a panel or caption arriving; the lid, drawer or door the visitor just touched; gentle ambient life in the room (fire, steam, dust, weather) away from the book.

Stays still: the page and the editor surface while someone is reading or writing; photos and captions once placed (no drift, wobble or parallax on them); anything near an open page; the scene behind a modal; controls and their labels. Only one thing is the hero at a time: the page turn, or the camera move, never both plus a flourish.

Never delay the content. A caption is readable and a photo can be placed or moved at any moment, including during a camera move or page turn. Motion runs beside the task and never gates it: no waiting for an animation to finish before an input is accepted, and a new request replaces the old move from wherever the camera or page currently is.

## Reduced motion (prefers-reduced-motion)

- Camera and view changes: immediate, no gliding (the camera book allows "immediate view changes or a short non-moving fade").
- Page turns, flips and panels: no travel or rotation; a short fade or an instant swap is fine.
- Ambient loops (steam, moths, motes, weather drift, window drift, blinking): off, or reduced to a still frame.
- Hover lifts and press scaling: off. Colour or outline changes may stay.
- Test it: set the browser to reduce motion (Playwright `reducedMotion: 'reduce'`) and check each moving thing in this guide. In code, use `useReducedMotion()` in React or `@media (prefers-reduced-motion: reduce)` in CSS.

## Checklist for any new motion

1. Does it help the visitor understand where they are or what changed? If not, leave it out.
2. Does it use a duration and easing from this page?
3. Is it off or instant under reduced motion?
4. Can the visitor read and act while it runs, and can it be interrupted?
5. Is it one primary movement, not several competing ones?
