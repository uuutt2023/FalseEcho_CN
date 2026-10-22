// Extract the display-text candidates (non-identifier strings) for a set of
// owners, so they can be reviewed and translated.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const mapped = new Set(Object.keys(map));

const owners = process.argv.slice(2);
const IDENT = /^[a-z0-9_.\-|@#+%:()\/ ]*$/;        // snake_case / ids
const isName = /^gml_(Script|Object|GlobalScript|Variable|struct)/;

for (const o of owners) {
  const rows = items.filter(it => it.owner && it.owner.includes(o));
  const keep = rows.filter(it => {
    const s = it.s;
    if (isName.test(s)) return false;
    if (/^gml_/.test(s)) return false;
    if (/^[a-z0-9_]+$/.test(s)) return false;            // pure lowercase ident
    if (IDENT.test(s) && !/[A-Z]/.test(s)) return false; // lowercase-ish ident
    if (!/[A-Za-z]/.test(s)) return false;
    return true;
  });
  console.log(`== ${o}`);
  for (const it of keep) {
    console.log(`  ${mapped.has(it.s) ? '[M]' : '   '} 0x${it.off.toString(16)} ${JSON.stringify(it.s)}`);
  }
}
