// Which map entries live in the main-menu (settings) drawing code?
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const mapped = new Set(Object.keys(map));

const OWNER = /obj_mainmenu_controller/;
const rows = items.filter(i => i.owner && OWNER.test(i.owner) && mapped.has(i.s));
console.log(`mainmenu strings that are in the map: ${rows.length}`);
for (const r of rows) {
  console.log(`  0x${r.off.toString(16)} ${r.owner}\n     EN ${JSON.stringify(r.s)}\n     CN ${JSON.stringify(map[r.s])}`);
}
// also: which of them are struct field names (lowercase) ?
console.log('\n--- lowercase (possible field names) in the map, whole exe:');
const lower = items.filter(i => mapped.has(i.s) && /^[a-z0-9_]+$/.test(i.s));
for (const l of lower) console.log(`  0x${l.off.toString(16)} ${l.owner} ${JSON.stringify(l.s)} -> ${JSON.stringify(map[l.s])}`);
