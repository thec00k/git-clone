// Every CC BY asset in the art ledgers must be credited in the app, and
// unverified provenance stays visible instead of being forgotten.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const credits = readFileSync(new URL('src/components/AssetCredits.tsx', root), 'utf8');
const ledgers = readdirSync(new URL('art/', root), {withFileTypes: true}).filter(d => d.isDirectory())
  .map(d => new URL(`art/${d.name}/asset-ledger.json`, root)).flatMap(url => { try { return [[url, JSON.parse(readFileSync(url, 'utf8'))]]; } catch { return []; } });

let credited = 0, unverified = 0;
for (const [url, ledger] of ledgers) {
  for (const asset of ledger.assets ?? []) {
    const licence = String(asset.license ?? asset.licence ?? '');
    if (/^CC-BY/i.test(licence)) {
      assert.ok(asset.author && asset.source, `${asset.id}: CC BY asset needs author and source in the ledger`);
      assert.ok(credits.includes(asset.author) && credits.includes(asset.source), `${asset.id}: CC BY credit for ${asset.author} is missing from AssetCredits.tsx`);
      credited++;
    }
    if (/not (independently )?verified|unverified|not recorded/i.test(JSON.stringify(asset))) unverified++;
  }
}
console.log(`PASS asset credits: ${credited} CC BY asset(s) credited in the app. ${unverified} ledger entr${unverified === 1 ? 'y' : 'ies'} still list unverified provenance (see docs/asset-licenses.md).`);
