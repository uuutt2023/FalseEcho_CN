// Full-pool coverage sweep: player-visible-looking pool strings that are NOT
// in literal_map.json and NOT covered by the 5 baked localization tables.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const mapped = new Set(Object.keys(map));

const load = (i) => JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());
const tableText = new Set();
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const walk = (n) => {
    if (typeof n === 'string') { tableText.add(n.trim()); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === 'object') return Object.values(n).forEach(walk);
  };
  walk(load(i));
}

const DEV = /Crystal|__cle_|__ppf_|CBM_|cornerstone|obj_dlg_test|gml_Script_|gml_Object_text_blend|gml_Object_obj_global/i;
const IDENT = /^[a-z0-9_.\-|@]+$/;                       // snake_case identifiers
const ASSET = /^(spr_|snd_|bmg_|obj_|bg_|fnt_|tl_|sk_|sprites|rooms)/i;

const out = [];
for (const it of items) {
  const s = it.s;
  if (!s || s.length < 2) continue;
  if (mapped.has(s)) continue;
  if (tableText.has(s.trim())) continue;
  if (it.owner && DEV.test(it.owner)) continue;
  if (ASSET.test(s)) continue;
  if (IDENT.test(s)) continue;                              // pure identifiers
  if (!/[A-Za-z]/.test(s)) continue;
  // display-text heuristics
  const isUpperLabel = /^[A-Z0-9 !?:.,'()\/-]{2,40}$/.test(s);
  const isSentence = /^[A-Z][a-z].*[.!?:]$/.test(s) && s.length > 12;
  if (!isUpperLabel && !isSentence) continue;
  out.push(it);
}
console.log(`untranslated display-looking pool strings: ${out.length}`);
// group by owner to spot whole screens
const byOwner = new Map();
for (const it of out) {
  const o = it.owner || '(none)';
  if (!byOwner.has(o)) byOwner.set(o, []);
  byOwner.get(o).push(it);
}
for (const [o, arr] of byOwner) {
  console.log(`\n== ${o} (${arr.length})`);
  for (const it of arr.slice(0, 40)) console.log(`   0x${it.off.toString(16)} ${JSON.stringify(it.s)}`);
  if (arr.length > 40) console.log(`   ... +${arr.length - 40}`);
}
fs.writeFileSync(path.join(root, 'extracted', 'untranslated_display.tsv'),
  out.map(it => `0x${it.off.toString(16)}\t${it.owner}\t${it.s.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
console.log(`\n-> extracted/untranslated_display.tsv`);
