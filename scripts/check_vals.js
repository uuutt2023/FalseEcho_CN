// Print: (a) the 3-column Endless rows, (b) the whole Rules matrix (blob 2576),
// (c) every literal_map entry that appears as a VALUE (not key) in the tables.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const load = (i) => JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());

const e = load(2575);
console.log('--- blob 2575 rows with 3 columns:');
e.filter(r => r.length !== 2).forEach(r => console.log('   ', JSON.stringify(r)));

console.log('\n--- blob 2576 full matrix:');
load(2576).forEach((r, i) => console.log(`   [${i}] ${JSON.stringify(r)}`));

const keys = new Set(), vals = new Set();
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  for (const row of load(i)) {
    if (typeof row[0] === 'string') keys.add(row[0].replace(/\r/g, '').trim());
    for (let c = 1; c < row.length; c++) if (typeof row[c] === 'string') vals.add(row[c].replace(/\r/g, '').trim());
  }
}
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
console.log('\n--- map entries that are table VALUES (candidate safe-to-patch):');
let n = 0;
for (const [k, v] of Object.entries(map)) {
  const t = k.trim();
  if (keys.has(t)) { console.log(`   KEY  ${JSON.stringify(k.slice(0, 80))}`); continue; }
  if (vals.has(t)) { n++; console.log(`   VAL  ${JSON.stringify(k.slice(0, 80))}`); }
}
console.log(`   total value-only: ${n}`);
