import fs from 'node:fs';
import assert from 'node:assert/strict';
// Extend the existing atlas vector: never regenerate or move geographical paths.
const source=fs.readFileSync('public/maps/world-room.svg','utf8');
const paths=[...source.matchAll(/<path\b[\s\S]*?\/>/g)].map(m=>m[0]);
const background=fs.readFileSync('art/sky-castle/atlas-parchment.png').toString('base64');
const land=paths.map(p=>p.replace(/\sstyle="[^"]*"/g,'')).join('\n');
const result=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="950" height="620" viewBox="0 0 950 620">
<title>The World — a celestial atlas</title>
<desc>Real-world coastlines and countries in the same coordinates as Keepsake's travel atlas, with illustrated parchment and celestial ornament.</desc>
<defs><linearGradient id="land" x2=".2" y2="1"><stop stop-color="#d2d5b4"/><stop offset=".5" stop-color="#abbca4"/><stop offset="1" stop-color="#b8c9ba"/></linearGradient>
<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#656b4b" stroke-width=".3" opacity=".20"/></pattern>
<clipPath id="continents">${land}</clipPath></defs>
<image width="950" height="620" href="data:image/png;base64,${background}" preserveAspectRatio="none"/>
<g id="real-world-geography" fill="url(#land)" stroke="#626e58" stroke-width=".45" stroke-linejoin="round" opacity=".91">${land}</g>
<rect width="950" height="620" fill="url(#hatch)" clip-path="url(#continents)"/>
<g font-family="Georgia,serif" fill="#715321" text-anchor="middle"><text x="475" y="32" font-size="17" letter-spacing="4">THE WORLD</text><text x="475" y="50" font-size="8" letter-spacing="2">A CELESTIAL ATLAS · PLACES WORTH KEEPING</text></g>
<g font-family="Georgia,serif" font-style="italic" font-size="10" fill="#42616a" text-anchor="middle" letter-spacing="1"><text x="350" y="290">Atlantic Ocean</text><text x="90" y="355">Pacific Ocean</text><text x="650" y="420">Indian Ocean</text><text x="450" y="535">Southern Ocean</text></g>
</svg>`;
// Match d + transform verbatim; visual styling cannot disturb saved pin alignment.
const geometry=p=>[p.match(/\sd="([^"]*)"/)?.[1],p.match(/\stransform="([^"]*)"/)?.[1]];
assert.deepEqual(paths.map(geometry),land.match(/<path\b[\s\S]*?\/>/g).map(geometry));
fs.writeFileSync('public/maps/world-sky-castle.svg',result);
console.log(`Sky Castle atlas: ${paths.length} original geographic paths retained, unchanged.`);
