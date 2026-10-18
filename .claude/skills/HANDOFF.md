# Skills handoff: what each skill is for and how to use it

Written 2026-10-15 for Tom (project owner, non-coder) and for any Claude picking this up.
Status: **installed on 2026-10-17** (see `README.md` for exactly which skills, what was left out and
why; source commits and licences are in `_sources/`). Skills load by their folder name, so a prompt
that says "use r3f-best-practices" finds it.

**Dates check (2026-10-17):** Tom asked for repos made in the past seven months. Real first-commit dates:
three-agent-skills 2026-01-16 and motion-design-agent 2026-01-23 are older than that, and motion-design-skill
(2026-03-12) is just outside. They stayed in because Tom chose them. The rest are inside: Three.js Skill Package
2026-03-20, threejs-game-skills 2026-06-14, webgl-animation-skills 2026-06-22, 3dviz-pro-max 2026-09-10,
blender-game-skills 2026-09-23.

## How Tom works with this (plain version)

1. **One gap, one thread.** Start a new thread in the project chat for each prompt below. Do not paste several at once; small changes are easier to review.
2. **Paste the prompt as written.** Each one names the skill, the gap, the files to read first and what "done" looks like.
3. **Expect a draft pull request, not a finished change.** Every prompt asks for before/after screenshots and a short plain-English summary. Look at the pictures, then say "merge", "change X" or "drop it".
4. **Say what you see, not how to fix it.** "The snow looks too busy" is a perfect instruction.
5. **Some things only Tom's computer can do:** Blender work, anything needing a graphics card, testing on a real phone. The prompts say when. The cloud session cannot do these.
6. **Decisions stay with Tom.** If a skill's advice fights the approved art direction (`keepsake/docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`), the art direction wins. Claude should flag the conflict, not pick a side.

## Rules every skill follows here

- Illustrated Nostalgia art direction and `keepsake/docs/v4-decisions.md` beat any skill's style advice.
- Preserve photo and scrapbook data. Never change stored data shapes without a migration and a test.
- No paid AI asset generation (Tripo, Gemini, ElevenLabs and similar) without Tom's approval.
- Any new file or asset goes into the licence ledger (`keepsake/licences/ledger.json`) with proof.
- Keep branches small. Do not merge room branches blindly. Update `keepsake/docs/handoff-current.md` when project status changes.
- Honest checks: cloud software rendering is about 5 seconds a frame, so no frame-rate claims from the cloud; use the `browser-checks` CI screenshots.

## Suggested order

| Order | Skill | Why first |
| --- | --- | --- |
| 1 | three-agent-skills | Fixes real audit findings; no art decisions needed. |
| 2 | blender-game-skills | Unblocks the Woodland object remodel; needs Tom's computer. |
| 3 | webgl-animation-skills + motion-design-skill | Polish pass on weather, fire, camera and page turns. |
| 4 | threejs-game-skills | Lighting and feel pass once objects are remodelled. |
| 5 | Three.js Claude Skill Package, 3dviz-pro-max, motion-design-agent | Reference only; use when a thread is stuck. |

---

## 1. three-agent-skills (performance and leak fixes)

- **Source:** https://github.com/emalorenzo/three-agent-skills · MIT · 40 stars (small, so treat advice as guidance, verify against the code).
- **What it is:** two rulebooks. `three-best-practices` (100+ rules, plain three.js) and `r3f-best-practices` (60+ rules, React Three Fiber, drei, rapier, zustand).
- **Gaps it fills (from the audit in `handoff-current.md`):** GPU caches for room and furniture models never evicted; display-case scan models leak; per-frame allocations in `WorkbenchBook` and `DiscoveryObject`; camera stops mid-turn on click; all images loaded into memory at startup.
- **Cautions:** it does not know Keepsake's rules. Fixes must keep photo, scan and book data intact, and each fix needs a check script or screenshot.
- **Done looks like:** one small draft PR per finding, each with a test or check that fails before and passes after.

**Prompt to paste:**
> Use the three-agent-skills (r3f-best-practices and three-best-practices) to fix the open 3D performance and leak findings from the audit in keepsake/docs/handoff-current.md, one finding per pull request, in this order: (1) display-case scan models leak, (2) GPU caches for room and furniture models are never evicted, (3) per-frame allocations in WorkbenchBook and DiscoveryObject. For each: show the cause in plain words, fix it, add or extend a check in keepsake/scripts that proves it, and run build, lint and the existing check scripts. Do not change how photos, scans or books are stored. Make draft PRs targeting codex/foundations-and-seasons. Tell me in plain language what each fix changes for a visitor.

## 2. blender-game-skills (remodel the Woodland objects)

- **Source:** https://github.com/majidmanzarpour/blender-game-skills · MIT · 7 stars, 1 commit (very new).
- **What it is:** a Claude Code skill (`blender-image-to-3d`) that builds game-ready Blender models from reference images and checks each build against the references. Needs Blender 4.2+, Python 3 with Pillow, Node 22+.
- **Gaps it fills:** "Remodel the 14 inherited Woodland objects" and the Beachfront remodel (open work in `start-here.md`); match models to the approved Woodland art direction.
- **Cautions:** must run on **Tom's computer** (Blender). It builds on top of the existing pipeline: read `keepsake/docs/blender-asset-workflow.md` and use `refresh-room-assets` and `check-room-assets` so models stay Draco-compressed and inside budget (Woodland 4.30/6.85 MiB). The provenance trace says the existing objects are Tom's own Blender builds, so no licence remodel is needed; this is for look, not legality.
- **Done looks like:** one object at a time, a before/after render, the model exported through the normal pipeline, ledger entry added.

**Prompt to paste (run in a Remote Control session on my computer, where Blender is installed):**
> Use the blender-game-skills (blender-image-to-3d) to remodel one Woodland object at a time so it matches the approved Illustrated Nostalgia direction. Start with the object that looks furthest from the art bible; show me the list of the 14 inherited objects first and your pick with a reason. Read keepsake/docs/blender-asset-workflow.md and the Woodland art docs in keepsake/docs/art-direction first, and export through the existing refresh-room-assets pipeline so the Balanced and High models stay within their size budgets. Give me a before and after render, run check-room-assets, add the licence ledger entry, and open a draft PR. Do one object, then stop for my feedback.

## 3. webgl-animation-skills (weather, fire, fireflies, dust)

- **Source:** https://github.com/iart-ai/webgl-animation-skills · MIT · 14 stars.
- **What it is:** three skills: `threejs-animation`, `shader-glsl`, `particle-system`.
- **Gaps it fills:** the hearth flame was ported but "positions not yet checked visually" and "finished textiles, flame effects and audio are later production work" (`woodland-proof.md`); outside-window weather exists, but ambient particles (fireflies, dust motes in window light, drifting leaves, chimney smoke) do not.
- **Cautions:** keep effects subtle, budgeted and switched off by `prefers-reduced-motion`. No cloud frame-rate claims. Effects must follow the season engine (`src/lib/seasons.ts`) rather than add new settings.
- **Done looks like:** one effect per PR, with a CI screenshot per season, reduced-motion behavior stated, and a note on cost.

**Prompt to paste:**
> Use the webgl-animation-skills (particle-system and shader-glsl) to add one subtle ambient effect to the Woodland cabin: dust motes drifting in the window light. First look at how HearthFire.tsx and the season engine work so the new effect fits them. Keep it gentle, cheap to draw, off under reduced motion, and visible in the browser-checks screenshots for day and dusk. Do not add a new setting. Open a draft PR with screenshots and a plain-English note on what it costs the visitor's device. Then suggest the next effect (fireflies in summer, leaves in autumn) and wait for my pick.

## 4. motion-design-skill from LottieFiles (timing and feel)

- **Source:** https://github.com/LottieFiles/motion-design-skill · MIT · 2.1k stars, 4 commits.
- **What it is:** principles only (timing, easing, choreography, Disney-style principles). No code. Works with any animation tool.
- **Gaps it fills:** camera moves between views (`keepsake/docs/art-direction/woodland-camera-book.md`), page turns (`BinderPageTurn.tsx`), panel open and close, so motion feels warm and consistent.
- **Cautions:** pure advice. Respect `prefers-reduced-motion`; no motion that delays reading a caption or placing a photo.
- **Done looks like:** a short written motion guide for Keepsake (durations, easing curves) plus a small PR applying it to one area.

**Prompt to paste:**
> Use the motion-design-skill to write a one-page motion guide for Keepsake (standard durations, easing, what moves and what stays still, reduced-motion rules) based on the camera book and the existing page-turn and panel animations. Save it in keepsake/docs. Then apply it to the camera moves between desk, corkboard and bookshelf only, in a draft PR with a short screen recording or screenshots. Do not change data or layout.

## 5. threejs-game-skills (lighting and feel)

- **Installed:** only `threejs-aaa-graphics-builder`, `threejs-qa-release`, `threejs-debug-profiler`. The paid generators, director and scaffold are left out on purpose.

- **Source:** https://github.com/majidmanzarpour/threejs-game-skills · MIT · 2.2k stars, 11 commits.
- **What it is:** nine skills with a director (`threejs-game-director`) that routes to gameplay, graphics, UI and QA specialists. Includes a Vite + TypeScript + three.js starter scaffold. Paid asset keys (Tripo, Gemini, ElevenLabs) are optional; leave them off.
- **Gaps it fills:** a lighting and material feel pass on the Woodland room, and QA checklists, once the objects are remodelled.
- **Cautions:** **do not use its scaffold or create a new project.** Use only the graphics and QA specialists inside the existing app. It is built for games with gameplay loops; Keepsake is a calm room, so ignore combat, score and difficulty advice.
- **Done looks like:** lighting changes with before/after screenshots at the approved camera views, and no new dependencies.

**Prompt to paste:**
> Use the graphics and QA skills from threejs-game-skills (not the scaffold, and no paid asset services) to review the lighting and material feel of the Woodland cabin at the approved camera views, in the dusk proof scene. List what looks flat, harsh or off against the art bible, ranked by impact. Fix the top three in a draft PR with before and after screenshots from the browser-checks job. Keep the scrapbook white point neutral so photos don't look amber. Do not add dependencies.

## 6. Three.js Claude Skill Package (reference)

- **Installed:** 5 of 24: R3F, Drei, lighting, post-processing, performance errors.

- **Source:** https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package · MIT · 20 stars, 8 commits.
- **What it is:** 24 reference skills for three.js, WebGL, WebGPU, React Three Fiber, Drei, physics.
- **Gaps it fills:** a look-up when a thread is unsure how a three.js or drei feature works.
- **Cautions:** it targets three r160+ and R3F 8.x and up. Keepsake runs three 0.185 and R3F 9 with React 19, so **verify any API against the installed versions** before using it. Skip IFC and other unrelated parts.
- **Done looks like:** used silently as reference; no standalone prompt needed.

**Prompt to paste only when stuck:**
> Use the Three.js Claude Skill Package as reference for [the specific thing], but check every API against the versions in keepsake/package.json (three 0.185, R3F 9, React 19) before using it, and say where the skill's advice was out of date.

## 7. 3dviz-pro-max (scene ideas, for exploration)

- **Not installed** (12 MB with third-party sample meshes). Optional on Tom's computer: `npx skills add viettranx/3dviz-pro-max`. The prompt below only works once it is installed.

- **Source:** https://github.com/viettranx/3dviz-pro-max · MIT · 18 stars, 5 commits, v0.1.0 (earliest of the picks).
- **What it is:** 223 recipes and 22 proven kits for composing three.js and Blender scenes.
- **Gaps it fills:** idea generation for how the display case should present a scan, or how a seasonal exterior could be composed.
- **Cautions:** it bundles third-party assets (BodyParts3D anatomy meshes, fonts) under their own licences. Install it, but never copy those assets into Keepsake. Treat output as sketches, not final art.
- **Done looks like:** three written options with simple mockups, then Tom picks one.

**Prompt to paste:**
> Use 3dviz-pro-max to propose three ways the display case could present a 3D scanned object (turntable, pedestal spotlight, floating with soft shadow). Look at the current display case code first. Give me a short description and a rough sketch or screenshot for each, how each handles a bad scan, and what it costs a phone. Do not copy any bundled assets. Do not build anything until I choose one.

## 8. motion-design-agent (camera and depth only)

- **Installed:** 5 skills, renamed `motion-camera`, `motion-depth`, `motion-3d-transforms`, `motion-rotation`, `motion-reflection`.

- **Source:** https://github.com/soilmass/motion-design-agent · MIT · 3 stars, 12 commits, v3.0.0 (least proven).
- **What it is:** 73 motion skills. Only a few matter here: `camera` (pan, tilt, dolly, parallax), `depth`, `3d-transforms`, `rotation`, `reflection`.
- **Gaps it fills:** vocabulary for camera moves and subtle parallax on the room views, and `reflection` ideas for glass furniture (Sky Castle).
- **Cautions:** much of it targets Material Design tokens and Lottie, which Keepsake does not use. Ignore everything outside camera, depth and 3D transforms. Overlaps with skill 4; if they disagree, skill 4 and the art direction win.
- **Done looks like:** used as a supplement to the motion guide from skill 4. No standalone PR.

**Prompt to paste only after skill 4's guide exists:**
> Use only the motion-camera, motion-depth and motion-3d-transforms skills to suggest improvements to the motion guide in keepsake/docs. Ignore Material Design tokens and Lottie. List what you would add or change and why, and wait for my approval before editing anything.

---

## Not in this set (decided against, 2026-10-15)

tldraw (paid production licence), magic-mcp (API key, no stated licence), stitch-skills (needs Google's Stitch service), shadcn/ui (stock web-app look), the community Figma tools (the official Figma connector is the better route; see the Figma note below), and everything Unreal, Unity or Godot only.
Maybes if wanted later: Impeccable (Apache 2.0) and Vercel's web-design-guidelines (MIT) for editor and menu polish and the open accessibility findings; ACE-Step 1.5 (MIT) for music, pending Tom's test of the prompts in `/mnt/project-files/keepsake/ace-step-test/prompts.md`.

**Figma note (correction, 2026-10-15):** the art direction and UI design system do live in Figma (file `5RwG3LC2YWU3QOcJ8DTUe9`; see `keepsake/docs/art-direction/README.md` and `keepsake/docs/ui-design-system.md`), and `project-status.md` lists "finish the unified interface in Figma" as open because the Figma tools were unavailable. So the official Figma connector matters. It currently fails from the cloud sandbox (proxy refuses `mcp.figma.com`), so Figma work needs the network allowance above or a session on Tom's computer. The community Figma repos add nothing the official connector lacks.
