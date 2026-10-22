// Show every pool string owned by a given script owner (or matching a name).
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const inMap = new Set(Object.keys(map));

const ownerArg = process.argv[2];
const textArg = process.argv[3];

let rows = items;
if (ownerArg && ownerArg !== '-') rows = rows.filter(it => it.owner && it.owner.toLowerCase().includes(ownerArg.toLowerCase()));
if (textArg && textArg !== '-') rows = rows.filter(it => it.s.includes(textArg));

console.log(`matched ${rows.length} strings`);
for (const it of rows) {
  const mark = inMap.has(it.s) ? 'MAPPED' : '      ';
  console.log(`${mark} 0x${it.off.toString(16)} len=${it.s.length} ${it.owner}`);
  console.log(`      ${JSON.stringify(it.s)}`);
}
