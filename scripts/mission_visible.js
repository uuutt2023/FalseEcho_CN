// 1) Is the mission "reason" field player-visible?  2) full list of
// sentence-like values in blobs 2560..2574 grouped by JSON path.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
console.log('--- pool strings that look like they consume a "reason" field:');
for (const it of items) {
  if (it.s === 'reason' || it.s.includes('reason"') || /reason_/.test(it.s)) {
    if (it.owner && /endless|mission|dialog|day|action|bubble|monolog|toast|notif/i.test(it.owner)) {
      console.log(`  0x${it.off.toString(16)} ${it.owner}  ${JSON.stringify(it.s)}`);
    }
  }
}
console.log('\n--- pool strings exactly "reason":');
for (const it of items) if (it.s === 'reason') console.log(`  0x${it.off.toString(16)} ${it.owner}`);

const HIDDEN_KEYS = new Set(['debug_jump_label', 'surface', 'reason', 'UID', 'uid', 'event_id',
  'sprite', 'spr_', 'snd_', 'bgm_', 'obj_', 'surface_name', 'label', 'name', 'icon', 'asset']);
console.log('\n--- candidate visible values in blobs 2560..2574:');
const out = [];
for (let i = 2560; i <= 2574; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const v = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim());
  (function walk(node, pathStr) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      const key = pathStr.split('.').pop().replace(/\[\d+\]$/, '');
      if (HIDDEN_KEYS.has(key)) return;
      if (/[A-Za-z]/.test(node) && /[ ,.!?]/.test(node) && node.length > 3) {
        out.push({ blob: i, path: pathStr, val: node });
      }
      return;
    }
    if (Array.isArray(node)) { node.forEach((x, j) => walk(x, `${pathStr}[${j}]`)); return; }
    if (typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], `${pathStr}.${k}`);
  })(v, '');
}
for (const o of out) console.log(`  [${o.blob}] ${o.path} = ${JSON.stringify(o.val)}`);
console.log(`\ntotal candidates: ${out.length}`);
fs.writeFileSync(path.join(root, 'extracted', 'mission_visible_candidates.tsv'),
  out.map(o => `${o.blob}\t${o.path}\t${o.val.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
