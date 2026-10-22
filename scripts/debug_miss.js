// Byte-compare the 3 unmatched map keys against the pool strings.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const byText = new Map();
for (const it of items) { if (!byText.has(it.s)) byText.set(it.s, []); byText.get(it.s).push(it); }

const probes = [
  'Earlier dates allowed from ',
  'One wrong, then random.',
  'Every message consists of INPUT and OUTPUT paper.',
];
for (const p of probes) {
  console.log(`\n=== probe ${JSON.stringify(p)}`);
  // candidates in the pool
  const cands = [...byText.keys()].filter(k => k.includes(p.replace(/^ /, '')));
  for (const c of cands) {
    console.log(`  pool: len=${c.length} ${JSON.stringify(c.slice(0, 80))}`);
    console.log(`        tail ${JSON.stringify(c.slice(-60))}`);
  }
  // map keys starting with the probe
  for (const k of Object.keys(map)) {
    if (k.includes(p.replace(/^ /, '').slice(0, 40))) {
      console.log(`  map : len=${k.length} ${JSON.stringify(k.slice(0, 80))}`);
      console.log(`        tail ${JSON.stringify(k.slice(-60))}`);
      const hit = byText.get(k);
      console.log(`        exact pool match: ${hit ? 'YES' : 'no'}`);
      if (!hit) {
        // find the closest pool string and diff
        for (const c of cands) {
          let i = 0; while (i < Math.min(c.length, k.length) && c[i] === k[i]) i++;
          console.log(`        diff at ${i}: pool=${JSON.stringify(c.slice(i, i + 20))} map=${JSON.stringify(k.slice(i, i + 20))}`);
        }
      }
    }
  }
}
