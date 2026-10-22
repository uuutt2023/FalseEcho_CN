// Owner distribution of the exe literal worklist, so we can tell game text
// from Crystal/PPFX dev-library text.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const rows = fs.readFileSync(path.join(root, 'trans', 'exe_work.tsv'), 'utf8')
  .split('\n').filter(Boolean).map(l => {
    const p = l.split('\t');
    return { off: +p[0], slot: +p[1], len: +p[2], owner: p[3], text: p.slice(4).join('\t') };
  });

const byOwner = new Map();
for (const r of rows) {
  const o = r.owner || '(none)';
  if (!byOwner.has(o)) byOwner.set(o, []);
  byOwner.get(o).push(r);
}
const sorted = [...byOwner.entries()].sort((a, b) => b[1].length - a[1].length);
console.log('total rows', rows.length, ' owners', sorted.length, '\n');
for (const [o, list] of sorted) {
  const dev = /Crystal|PPFX|cornerstone|__cle_|CBM_|Diagnostic/i.test(o);
  console.log(`${String(list.length).padStart(4)}  ${dev ? '[DEV] ' : '[GAME]'} ${o}`);
}
console.log('\n--- GAME-owner rows ---');
for (const [o, list] of sorted) {
  if (/Crystal|PPFX|cornerstone|__cle_|CBM_|Diagnostic/i.test(o)) continue;
  console.log(`\n### ${o}  (${list.length})`);
  for (const r of list) {
    const t = r.text.replace(/\\n/g, ' \u21b5 ');
    console.log(`  0x${r.off.toString(16)} slot=${r.slot} | ${t.length > 150 ? t.slice(0, 150) + '...' : t}`);
  }
}
