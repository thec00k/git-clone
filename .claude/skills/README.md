# Agent skills for Keepsake

Third-party skills that help Claude with 3D, Blender and motion work on Keepsake, plus ponytail for keeping code changes small.
Tom chose the packs on 2026-10-14 and 2026-10-15; they were copied in on 2026-10-17. Tom added ponytail on 2026-10-18.
They are guidance for the agent, not app code: nothing here ships to users.
Claude Code finds every folder below that holds a `SKILL.md`. Folders starting with
`_` are not skills.

For what each pack is for, its cautions and a ready-to-paste prompt, read [HANDOFF.md](HANDOFF.md).

## What is installed

| Pack (source, MIT) | Installed skills | Left out, and why |
| --- | --- | --- |
| [threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | `threejs-aaa-graphics-builder`, `threejs-qa-release`, `threejs-debug-profiler` | Paid generators (Tripo, Gemini, ElevenLabs), the game director, the gameplay scaffold and game-UI skill: Keepsake is a calm room and paid generation needs Tom's approval. |
| [blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills) | `blender-image-to-3d` | Nothing. Needs Blender 4.2+ on Tom's computer. |
| [Three.js Claude Skill Package](https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package) | `threejs-impl-react-three-fiber`, `threejs-impl-drei`, `threejs-impl-lighting`, `threejs-impl-post-processing`, `threejs-errors-performance` | The other 19 (IFC, XR, WebGPU and similar), to keep the skill list short. Targets R3F 8 and three r160, so verify APIs against `keepsake/package.json`. |
| [webgl-animation-skills](https://github.com/iart-ai/webgl-animation-skills) | `particle-system`, `shader-glsl`, `threejs-animation` | Showcase files. |
| [motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | `motion-design` | Nothing. |
| [motion-design-agent](https://github.com/soilmass/motion-design-agent) | `motion-camera`, `motion-depth`, `motion-3d-transforms`, `motion-rotation`, `motion-reflection` | The other 81 skills. Renamed with a `motion-` prefix because `camera` and `depth` are too generic; token files copied into each folder. |
| [three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | `r3f-best-practices`, `three-best-practices` | Nothing. |
| [ponytail](https://github.com/DietrichGebert/ponytail) | `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` | The plugin hooks (auto-on every session, level memory, status band) and the other agents' config files. Run `/ponytail` to turn it on; for always-on, install the plugin on Tom's computer instead. Added 2026-10-18. |
| [3dviz-pro-max](https://github.com/viettranx/3dviz-pro-max) | not installed | 12 MB of recipes and sample 3D kits that bundle third-party meshes under their own licences. Optional: install it on Tom's computer with `npx skills add viettranx/3dviz-pro-max` if wanted. |

Source commits and licences are in `_sources/<pack>/` (`SOURCE.txt`, `LICENSE`). The only edits
to the originals are listed in `_sources/CHANGES.md`.

## Rules when using them

- The approved art direction (`keepsake/docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`)
  and `keepsake/docs/v4-decisions.md` win over any skill's style advice.
- Paid AI asset generation stays off unless Tom approves; generated assets would also need
  entries in the licence ledger.
- Any asset a skill produces goes through the normal ledger in `keepsake/licences/`.
- Treat the skills as third-party instructions: review changes to them like code, and re-read
  a skill before updating it from its source.
