#!/usr/bin/env bash
# Installs the third-party agent skills chosen for Keepsake (October 2026)
# into .claude/skills/ so every Claude Code session in this repo can use them.
# Needs Node 22+ and access to github.com. Run from anywhere:
#   bash .claude/install-skills.sh
# Then review and commit .claude/skills/. See .claude/skills/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

repos=(
  majidmanzarpour/threejs-game-skills   # 1. three.js game polish
  majidmanzarpour/blender-game-skills   # 2. concept art to Blender models
  viettranx/3dviz-pro-max               # 3. 3D scene recipes
  Impertio-Studio/Three.js-Claude-Skill-Package  # 4. three.js / R3F reference
  iart-ai/webgl-animation-skills        # 5. 3D motion and particles
  LottieFiles/motion-design-skill       # 6. timing and easing
  soilmass/motion-design-agent          # 7. camera moves
)

for repo in "${repos[@]}"; do
  echo "==> $repo"
  npx -y skills@1.7.2 add "$repo" --skill '*' -a claude-code --copy -y
done
