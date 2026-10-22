// Find which scripts reference the Endless table keys, and how rows are consumed.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const probes = ['day_99_txt_dia', 'day_99_txt_msg', 'endless_dialogue', 'day_99_txt'];
const owners = new Set();
for (const it of items) {
  for (const p of probes) {
    if (it.s.includes(p)) { owners.add(it.owner); break; }
  }
}
console.log('owners referencing day_99_* :', [...owners].filter(Boolean).join('\n  '));

// strings owned by the endless dialogue scripts
const cand = [...owners].filter(Boolean).filter(o => /endless|day_99/i.test(o));
console.log('\n--- candidate owners:', cand.join(', '));
const rows = items.filter(it => cand.includes(it.owner));
const out = path.join(root, 'extracted', 'endless_scripts.txt');
fs.writeFileSync(out, rows.map(it => `0x${it.off.toString(16)}\t${it.owner}\t${JSON.stringify(it.s)}`).join('\n'), 'utf8');
console.log(`-> ${out} (${rows.length} strings)`);
