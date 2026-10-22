// Look up the official CN names for the characters / sender IDs used in the
// mission data, so the step 'reason' texts stay consistent with the tables.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const cn = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const en = {};
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const earr = JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());
  const carr = JSON.parse(cn[String(i)].replace(/[\u0000]+/g, '').trim());
  for (let r = 0; r < earr.length; r++) {
    if (!Array.isArray(earr[r]) || !Array.isArray(carr[r])) continue;
    for (let c = 1; c < earr[r].length; c++) {
      if (typeof earr[r][c] === 'string') en[earr[r][c]] = carr[r][c];
    }
  }
}
const probes = ['Desny', 'Maki', 'Porter', 'Velmer', 'Tasher', 'Fargen', 'Retromicin',
  'SUBHUNT', 'CITADEL', 'NAVAL HQ', 'STATE SECURITY', 'Political Officer', 'Watch Officer',
  'Torpedo Room', 'Helmsman', 'Sailor04', 'Sailor09', 'Lieutenant', 'Naval HQ'];
for (const p of probes) {
  const hits = Object.entries(en).filter(([k]) => k.includes(p)).slice(0, 6);
  console.log(`== ${p}`);
  for (const [k, v] of hits) console.log(`   ${JSON.stringify(k.slice(0, 80))}\n     => ${JSON.stringify(v)}`);
}
