// Build the definitive EXE worklist: player-facing strings that are NOT values
// of the 5 baked localization tables (those are handled by patching the tables).
const fs = require('fs');
const path = require('path');
const { loadPool, buildIndex } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';
const exePath = ['E:', 'SteamLibrary', 'steamapps', 'common', 'False Echo Demo', 'False Echo.exe'].join('/');

const { items } = loadPool(exePath);
const idx = buildIndex(items);
console.log('pool strings:', items.length);

// English table values -> table-driven, skip
const tableVals = new Set();
for (let i = 2575; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const arr = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000\s]+$/g, ''));
  for (const row of arr) {
    if (Array.isArray(row)) for (const c of row) if (typeof c === 'string') tableVals.add(c.replace(/\r/g, '').trim());
  }
}
const norm = s => s.replace(/\r/g, '').trim();

// STRG candidate list (player-facing, not table-driven) produced earlier
const rows = fs.readFileSync(path.join(root, 'trans', 'exe_literals.tsv'), 'utf8')
  .split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { idx: +p[0], s: p[2] }; });

const DEV_OWNER = /test|debug|TEST_MOUSE|PostProcessing|CleanUp|obj_dornier|scr_content_payload|wishlist|retromagine|crumble|dialog_list/i;

const out = [];
const seen = new Set();
let missed = 0;
for (const r of rows) {
  const raw = r.s.replace(/\\r$/, '').replace(/\\n/g, '\n');
  const it = idx.get(raw) || idx.get(raw.replace(/\r/g, '')) || idx.get(raw.trim());
  if (!it) { missed++; continue; }
  if (DEV_OWNER.test(it.owner || '')) continue;
  const key = it.off;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({ idx: r.idx, off: it.off, slot: it.slot, len: it.len, text: it.s, owner: it.owner, table: tableVals.has(norm(it.s)) });
}
console.log('resolved:', out.length, 'missed:', missed, ' of which table-driven:', out.filter(o => o.table).length);
fs.writeFileSync(path.join(root, 'trans', 'exe_work.tsv'),
  out.map(o => `${o.off}\t${o.slot}\t${o.len}\t${o.owner}\t${o.text.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
console.log('written trans/exe_work.tsv');
for (const o of out.filter(o => !o.table)) console.log(`${o.off}\tslot=${o.slot}\t${JSON.stringify(o.text).slice(0, 130)}`);
