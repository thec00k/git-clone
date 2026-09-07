import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scripts = [
  'check-woodland.mjs', 'check-editor.mjs', 'check-memory-features.mjs',
  'check-discoveries.mjs', 'check-discovery-geometry.mjs', 'check-room-music.mjs',
  'check-room-shop.mjs', 'check-soundcloud.mjs', 'check-spotify.mjs',
];
for (const script of scripts) {
  process.stdout.write(`\nChecking ${script}\n`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  }
}
console.log('\nAll automated acceptance checks passed. Browser and real-device checks are tracked in docs/project-status.md.');
