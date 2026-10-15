# Agent skills for Keepsake

Third-party skills that help Claude with 3D, Blender and motion work on
Keepsake. Tom chose these on 2026-10-14 and 2026-10-15. They are guidance for the agent,
not app code: nothing here ships to users.

| # | Skill pack | What it helps with | License |
| - | --- | --- | --- |
| 1 | [threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | Game-style polish for the three.js room: lighting, feel, QA. Optional paid asset keys are not needed. | MIT |
| 2 | [blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills) | Turning reference art into Blender models (the Woodland object remodel). Needs Blender 4.2+. | MIT |
| 3 | [3dviz-pro-max](https://github.com/viettranx/3dviz-pro-max) | Recipes for composing three.js and Blender scenes. | MIT |
| 4 | [Three.js Claude Skill Package](https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package) | Reference skills for three.js, React Three Fiber and Drei. | MIT |
| 5 | [webgl-animation-skills](https://github.com/iart-ai/webgl-animation-skills) | 3D motion, shaders and particles (snow, fireflies, dust). | MIT |
| 6 | [motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | Timing, easing and choreography for camera moves and page turns. | MIT |
| 7 | [motion-design-agent](https://github.com/soilmass/motion-design-agent) | Camera moves (dolly, pan, parallax) and depth. | MIT |
| 8 | [three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | 3D performance rules for three.js and React Three Fiber; fixes the open leak findings. | MIT |

For what each one is for, its cautions, and a ready-to-paste prompt, read [HANDOFF.md](HANDOFF.md).

## Installing

Run `bash .claude/install-skills.sh` on a machine that can reach github.com,
then review and commit the new folders here. Keep each pack's LICENSE file.

The cloud sandbox used by the project's Claude threads cannot reach
github.com downloads unless the project's cloud environment allows
`github.com` and `codeload.github.com`.

## Rules when using them

- The approved art direction (`keepsake/docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`)
  and `keepsake/docs/v4-decisions.md` win over any skill's style advice.
- Skills that offer paid AI asset generation (Tripo, Gemini, ElevenLabs)
  stay off unless Tom approves; generated assets would also need entries in
  the licence ledger.
- Any asset a skill produces goes through the normal ledger in
  `keepsake/licences/`.
