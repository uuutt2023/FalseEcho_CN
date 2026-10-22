// Are the data.win STRG mission/step blobs (2560..2574) also baked into the exe?
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const all = items.map(it => it.s).join('\n');
const probes = [
  'statement_oath', 'day01_statement_signature', 'm_endless_ver_01', 'm_d01_01',
  'day99_dialogues', 'endless_dialogue_officers_npc_verification_exit_05_true',
  'sender_id_code', 'SUBHUNT', 'late_allowed_sender_keys', 'paper_requirements',
  'msgDateTrue', 'ver_sender_key', 'ocean_set_A', 'step_pre_po_what_a_monologue',
];
for (const p of probes) {
  const n = items.filter(it => it.s.includes(p)).length;
  console.log(`${n === 0 ? 'NOT IN EXE ' : 'in exe       '} ${String(n).padStart(4)}  ${p}`);
}

// now scan the data.win STRG blobs 2560..2574 for embedded English values
console.log('\n--- embedded English-looking values inside data.win STRG mission blobs:');
for (let i = 2560; i <= 2574; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  let v; try { v = JSON.parse(s); } catch { continue; }
  const hits = new Set();
  (function walk(node, pathStr) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      // english-looking: has a space and ascii letters
      if (/[A-Za-z]/.test(node) && /[ ,.]/.test(node) && !/^[a-z0-9_]*$/.test(node)) hits.add(pathStr + ' = ' + JSON.stringify(node));
      return;
    }
    if (Array.isArray(node)) { node.forEach((x, j) => walk(x, `${pathStr}[${j}]`)); return; }
    if (typeof node === 'object') { for (const k of Object.keys(node)) walk(node[k], `${pathStr}.${k}`); }
  })(v, '');
  if (hits.size) {
    console.log(`\n=== blob ${i}: ${hits.size} english-ish values`);
    [...hits].slice(0, 40).forEach(h => console.log('   ' + h));
    if (hits.size > 40) console.log(`   ... +${hits.size - 40} more`);
  }
}
