// Build a complete player-facing literal worklist straight from the EXE string
// pool (the STRG-derived list missed labels that only exist in the exe).
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const exePath = path.join(root, 'backup_original', 'False Echo.exe');
const { items } = loadPool(exePath);

// owner blocks: map every pool item to the script that owns it
const DEV = /Crystal|__cle_|__ppf_|CBM_|cornerstone/i;
const owners = new Map();
for (const it of items) {
  if (!owners.has(it.owner)) owners.set(it.owner, []);
  owners.get(it.owner).push(it);
}

// text that is obviously not player-facing
const SKIP_RE = [
  /^https?:\/\//i, /^datafiles\//, /^save\//, /^data\//, /^\.[a-z0-9]+$/i,
  /^[a-z_][a-z0-9_]*$/,                    // identifier
  /^[a-z_]+@[a-z_0-9@]+$/i,                // gml_Script_anon@...
  /^\d+$/,
  /^gml_/,
  /^\.json$/, /^\.csv$/, /\.json$/, /\.csv$/,
  /^[A-Za-z0-9+/=]{40,}$/,                 // base64
];
function isDisplayText(s) {
  const t = s.replace(/\\n/g, ' ').trim();
  if (!t) return false;
  if (SKIP_RE.some(r => r.test(t))) return false;
  // must contain a space, or be a short ALL-CAPS label (a UI word)
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return false;
  if (!/ /.test(t) && t.length > 24) return false;
  return true;
}

const out = [];
for (const [owner, list] of owners) {
  if (!owner) continue;
  if (DEV.test(owner)) continue;
  for (const it of list) {
    if (!isDisplayText(it.s)) continue;
    out.push({ off: it.off, slot: it.slot, len: it.len, owner, text: it.s });
  }
}
console.log('candidate display strings in game scripts:', out.length);
fs.writeFileSync(path.join(root, 'trans', 'pool_display.tsv'),
  out.map(o => `${o.off}\t${o.slot}\t${o.len}\t${o.owner}\t${o.text.replace(/\n/g, '\\n').replace(/\t/g, ' ')}`).join('\n'),
  'utf8');
console.log('-> trans/pool_display.tsv');

// group by owner for reading
const byOwner = new Map();
for (const o of out) {
  if (!byOwner.has(o.owner)) byOwner.set(o.owner, []);
  byOwner.get(o.owner).push(o);
}
const lines = [];
for (const [ow, list] of [...byOwner].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`\n### ${ow}  (${list.length})`);
  for (const o of list) lines.push(`  0x${o.off.toString(16)}\tslot=${o.slot}\t${JSON.stringify(o.text.length > 200 ? o.text.slice(0, 200) + '...' : o.text)}`);
}
fs.writeFileSync(path.join(root, 'trans', 'pool_display.txt'), lines.join('\n'), 'utf8');
console.log('-> trans/pool_display.txt');
