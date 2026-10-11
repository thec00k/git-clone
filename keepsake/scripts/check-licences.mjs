// Licence ledger guard. Every tracked file under public/ and art/ must be covered by an entry in
// licences/ledger.json, every entry must still match a file, and each entry must carry the facts its
// status requires. `node scripts/check-licences.mjs --report` also rewrites docs/licence-report.md.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, statSync} from 'node:fs';

const root = new URL('..', import.meta.url);
const ledger = JSON.parse(readFileSync(new URL('licences/ledger.json', root), 'utf8'));
const STATUSES = Object.keys(ledger.statuses);

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { out += '.*'; i++; if (glob[i + 1] === '/') i++; }
    else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + out + '$');
}

const files = execFileSync('git', ['ls-files', 'public', 'art'], {cwd: root, encoding: 'utf8'}).split('\n').filter(Boolean);
const entries = ledger.assets.map(a => ({...a, patterns: a.files.map(globToRegExp)}));
const problems = [];

const ids = new Set();
for (const a of entries) {
  if (ids.has(a.id)) problems.push(`duplicate id ${a.id}`);
  ids.add(a.id);
  for (const field of ['id', 'files', 'kind', 'status', 'origin', 'author', 'licence', 'commercialUse'])
    if (a[field] === undefined || a[field] === '') problems.push(`${a.id}: missing ${field}`);
  if (!STATUSES.includes(a.status)) problems.push(`${a.id}: unknown status ${a.status}`);
  if (a.status === 'verified' && !(a.proof?.length)) problems.push(`${a.id}: verified needs proof`);
  if (a.status === 'verified' || a.status === 'documented') if (a.origin === 'third-party' && !a.source) problems.push(`${a.id}: third-party needs source`);
  if (/^CC-BY/.test(a.licence) && a.creditedInApp !== true) problems.push(`${a.id}: CC BY assets must be credited in the app`);
  if (a.status === 'unverified' && !a.action) problems.push(`${a.id}: unverified entries need an action`);
  for (const p of a.proof ?? []) if (!/^https?:/.test(p)) { try { statSync(new URL(p, root)); } catch { problems.push(`${a.id}: proof file missing ${p}`); } }
  a.patterns.forEach((re, i) => { if (!files.some(f => re.test(f))) problems.push(`${a.id}: pattern matches nothing: ${a.files[i]}`); });
}
const coverage = new Map();
for (const f of files) {
  const owners = entries.filter(a => a.patterns.some(re => re.test(f)));
  if (!owners.length) problems.push(`not in licences/ledger.json: ${f}`);
  coverage.set(f, owners);
}

if (process.argv.includes('--report')) {
  const order = ['unverified', 'ai-generated', 'documented', 'verified', 'original'];
  const bytes = f => { try { return statSync(new URL(f, root)).size; } catch { return 0; } };
  const lines = ['# Licence report', '', `Generated from licences/ledger.json (${ledger.updated}) by \`node scripts/check-licences.mjs --report\`. Do not edit by hand.`, ''];
  lines.push('| Status | Entries | Files |', '| --- | --- | --- |');
  for (const s of order) { const es = entries.filter(a => a.status === s); lines.push(`| ${s} | ${es.length} | ${files.filter(f => coverage.get(f).some(a => a.status === s)).length} |`); }
  lines.push('', 'Status meanings: ' + order.map(s => `**${s}**: ${ledger.statuses[s]}`).join(' '), '');
  for (const s of order.slice(0, 3)) {
    const es = entries.filter(a => a.status === s); if (!es.length) continue;
    lines.push(`## ${s}`, '');
    for (const a of es) {
      const matched = files.filter(f => a.patterns.some(re => re.test(f)));
      const runtime = matched.filter(f => f.startsWith('public/'));
      lines.push(`### ${a.id}`, '', `- **Files:** ${matched.length} (${runtime.length} shipped, ${(runtime.reduce((n, f) => n + bytes(f), 0) / 1048576).toFixed(1)} MB shipped)`, `- **Author / origin:** ${a.author} (${a.origin})`, `- **Licence:** ${a.licence}`);
      if (a.blocker) lines.push(`- **Why:** ${a.blocker}`);
      if (a.keptInheritedObjects) lines.push(`- **Inherited objects to remodel:** ${a.keptInheritedObjects.join(', ')}`);
      if (a.action) lines.push(`- **Next action:** ${a.action}`);
      lines.push('');
    }
  }
  writeFileSync(new URL('docs/licence-report.md', root), lines.join('\n'));
  console.log('Wrote docs/licence-report.md');
}

assert.deepEqual(problems, [], 'Licence ledger problems:\n' + problems.join('\n'));
const unverified = entries.filter(a => a.status === 'unverified' || a.status === 'ai-generated');
console.log(`Licence ledger: ${files.length} files covered by ${entries.length} entries; ${unverified.length} entries still need replacing or checking before public launch.`);
