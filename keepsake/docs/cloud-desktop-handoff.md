# Cloud and desktop collaboration handoff

Repository: https://github.com/thec00k/git-clone.git
Application: keepsake/ (React/Vite/Three.js). Use main as the shared integration branch.

## Start here
Read keepsake/docs/project-status.md, keepsake/docs/v4-decisions.md and keepsake/docs/furniture-quality-checks.md. Verify implementation in source; distinguish finished features from scoped prototypes and backlog. Earlier conversations are not automatically shared with another task.

Recent changes through b578771: text boxes now have corner resize and rotate handles; page element drag previews stay local until pointer release; caption edges drag without selecting text. Markers sit left below the camera, camera moved back, desk note shifted left. Printer faces the user near the cup in front of the CRT. Latest build and targeted browser checks passed; these do not certify every furniture combination. The saved Beachfront .blend is included in this handoff commit without re-exporting or altering it. Unsaved Blender session state is not part of Git.

## Working agreement
Cloud task: review, propose ideas, and make scoped code changes on a separate codex/ branch with a reviewable PR. Record rationale, affected files, tests run, and desktop/Blender checks still required. Do not push competing edits directly to main or change binary Blender scenes while desktop owns them. First assignment: inspect current build and propose a prioritized list of five improvements, grounded in source and existing backlog, without implementing new features yet.

Desktop task: when the user returns, read the cloud handoff/PR, compare against current local work, integrate approved changes, then run browser and Blender quality checks. Preserve local browser memories and user-authored scenes. Cloud cannot assume access to desktop localhost, local Blender MCP, or personal browser storage. Use disposable test contexts.

Communication: use task messaging when accessible, plus this repository and PR descriptions as durable records. No unattended polling, continuous conversation, or automatic local synchronization has been configured. The user can bring the cloud task or PR link back to the desktop task to resume coordination.

## Product constraints
Polished desktop prototype first; preserve scrapbook behavior. Woodland and Beachfront exist. Shared interaction systems precede remaining rooms. Art references: Edith Finch, LittleBigPlanet, Life is Strange, Sly Cooper, Firewatch (above inFAMOUS). Keep stamp currency and current music providers. AI ticket companion uses editable templates until backend setup. Prioritize careful visual QC, accessible controls, reduced motion, photo safety, and clear local-versus-cloud boundaries. Do not call unfinished social/backend functions complete.

## Validation
Run npm commands inside keepsake/. Start with npm ci, npm run build and relevant check scripts in package.json. Browser scripts accept PLAYWRIGHT_MODULE/TEST_BROWSER/TEST_BASE_URL where documented; configure paths for the cloud environment instead of assuming Windows. Never seed or reset the user's localhost:5176 storage. Furniture changes require visual checks of open/closed books, desk props, variants, day/night and collision clearances.
