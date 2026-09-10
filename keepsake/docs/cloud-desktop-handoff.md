# Cloud and desktop collaboration handoff

Repository: https://github.com/thec00k/git-clone.git
Application: keepsake/ (React/Vite/Three.js). Use main as the shared integration branch.

## Start here
Read keepsake/docs/project-status.md, keepsake/docs/v4-decisions.md and keepsake/docs/furniture-quality-checks.md. Verify implementation in source; distinguish finished features from scoped prototypes and backlog. Earlier conversations are not automatically shared with another task.

## Complete reference set
Product and decisions: `keepsake/README.md`, `keepsake/docs/project-status.md`, `keepsake/docs/v4-decisions.md`, `keepsake/docs/next-polish-direction.md`, `keepsake/docs/deferred-improvements.md`, `keepsake/docs/woodland-prototype.md`, and `keepsake/docs/beachfront-prototype.md`.

Art and Blender workflow: `keepsake/docs/blender-asset-workflow.md`, `keepsake/docs/furniture-quality-checks.md`, `keepsake/art/furniture/README.md`, the furniture `asset-ledger.json`, `keepsake/art/beachfront/asset-ledger.json`, and the source scripts under `keepsake/art/beachfront/`. Furniture and room `.blend` files are versioned assets; inspect them through Blender rather than treating binary diffs as readable design notes. The authored demos and historical records are in `keepsake/art/demos/` and `keepsake/docs/keepsake-suggestions.pdf` / `keepsake/docs/keepsake-worklog.pdf`.

Validation entry points: `keepsake/package.json` and scripts in `keepsake/scripts/`: `check-acceptance.mjs`, `check-workbench-browser.mjs`, `check-furniture-clearance-browser.mjs`, `check-storage-browser.mjs`, `check-memory-expansion-browser.mjs`, `check-caption-transforms-browser.mjs`, `check-originals-browser.mjs`, `check-offline-browser.mjs`, and the deterministic checks `check-editor.mjs`, `check-memory-features.mjs`, `check-discoveries.mjs`, and `check-workbench.mjs`. Test fixtures and routes live in `keepsake/tests/` and `keepsake/src/tests/`.

Current source areas: scrapbook interaction in `keepsake/src/components/ElementView.tsx`, `keepsake/src/components/SelectionToolbar.tsx`, `keepsake/src/components/BookView.tsx`, `keepsake/src/components/room3d/WorkbenchBook.tsx`, and `keepsake/src/hooks/useScrapbook.ts`; room props and furniture in `keepsake/src/components/room3d/`; persistence and memory systems in `keepsake/src/lib/`, `keepsake/src/store/`, and `keepsake/src/components/`; styling in `keepsake/src/index.css`. Treat `keepsake/art/demo-work/` as local scratch output and do not use it as product source.

The user's original product document is included as `keepsake/docs/Keepsake_Updated_Bible_v4.pdf`. Read it alongside `v4-decisions.md`: later user decisions (including retaining stamp currency and starting tickets with editable templates) supersede conflicting proposals in the PDF. Woodland source and its ledger are under `keepsake/art/woodland/`; browser-ready assets are under `keepsake/public/room/`, with artwork and attribution under `keepsake/public/artwork/`. Source scenes and web exports can differ: the application also adds and positions objects at runtime.

The physical scrapbook source is `keepsake/art/workbench/scrapbook.blend`; its authoring script is `keepsake/art/pipeline/build-workbench-book.py`. Preserve the node names and animation contracts expected by `WorkbenchBook.tsx` when updating or exporting it.

Recent changes through b578771: text boxes now have corner resize and rotate handles; page element drag previews stay local until pointer release; caption edges drag without selecting text. Markers sit left below the camera, camera moved back, desk note shifted left. Printer faces the user near the cup in front of the CRT. Latest build and targeted browser checks passed; these do not certify every furniture combination. The saved Beachfront .blend is included in this handoff commit without re-exporting or altering it. Unsaved Blender session state is not part of Git.

## Working agreement
Cloud task: review, propose ideas, and make scoped code changes on a separate codex/ branch with a reviewable PR. Record rationale, affected files, tests run, and desktop/Blender checks still required. Do not push competing edits directly to main or change binary Blender scenes while desktop owns them. First assignment: inspect current build and propose a prioritized list of five improvements, grounded in source and existing backlog, without implementing new features yet.

Desktop task: when the user returns, read the cloud handoff/PR, compare against current local work, integrate approved changes, then run browser and Blender quality checks. Preserve local browser memories and user-authored scenes. Cloud cannot assume access to desktop localhost, local Blender MCP, or personal browser storage. Use disposable test contexts.

Communication: use task messaging when accessible, plus this repository and PR descriptions as durable records. No unattended polling, continuous conversation, or automatic local synchronization has been configured. The user can bring the cloud task or PR link back to the desktop task to resume coordination.

The handoff builds on shared checkpoint `c6512be`. Obtain the latest `main` commit when starting; this documentation and the original Bible are committed afterward. If a cloud task creates a branch or PR, record its branch, commit, scope, and checks here or in the PR before asking the desktop task to integrate it.

## Remaining work and access boundaries
Consult `v4-decisions.md` for exact scope: memory lighting, sound geography, Found Photos, offline preparation, book trails, and commemorative tickets have initial local implementations. Larger-library browsing/archiving, the themed time-capsule chest, broader memory artifacts and trails, larger-library backup export, and backend-backed social/AI systems still need work. Remaining room themes include Cyberpunk Cityscape, Snowy Mountain, and Stormy Lighthouse. Recheck the current checklist before choosing a task.

Git contains the project files and documents, not the user's IndexedDB photos/books, unsaved Blender changes, account credentials, installed plugins, or this complete conversation. Do not assume those are available in cloud. The decisions recorded here and in the linked documents are the portable context. Keep credentials and personal memory backups out of commits.

## Product constraints
Polished desktop prototype first; preserve scrapbook behavior. Woodland and Beachfront exist. Shared interaction systems precede remaining rooms. Art references: Edith Finch, LittleBigPlanet, Life is Strange, Sly Cooper, Firewatch (above inFAMOUS). Keep stamp currency and current music providers. AI ticket companion uses editable templates until backend setup. Prioritize careful visual QC, accessible controls, reduced motion, photo safety, and clear local-versus-cloud boundaries. Do not call unfinished social/backend functions complete.

## Validation
Run npm commands inside keepsake/. Start with npm ci, npm run build and relevant check scripts in package.json. Browser scripts accept PLAYWRIGHT_MODULE/TEST_BROWSER/TEST_BASE_URL where documented; configure paths for the cloud environment instead of assuming Windows. Never seed or reset the user's localhost:5176 storage. Furniture changes require visual checks of open/closed books, desk props, variants, day/night and collision clearances.
