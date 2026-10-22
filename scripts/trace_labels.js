// For a set of on-screen labels: where do they live (CSV table key / STRG index)?
// and did we translate the CSV entry?
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

function readTsv(p) {
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  return raw.split('\n').filter(l => l.length).map(l => {
    const i = l.indexOf('\t');
    return [l.slice(0, i), l.slice(i + 1)];
  });
}
const strgRows = readTsv(path.join(root, 'extracted', 'strings.tsv'))
  .map(([k, v]) => ({ idx: +/^\[(\d+)\]$/.exec(k)[1], s: v }));

const orig = JSON.parse(fs.readFileSync(path.join(root, 'extracted', 'blob_2578.json'), 'utf8').replace(/[\u0000\s]+$/g, ''));
const csvMap = new Map(orig);   // key -> original EN value

// current (translated) table lives in apply/blobs.json
const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
let curTable = null;
for (const [k, v] of Object.entries(cur)) {
  let d; try { d = JSON.parse(v); } catch (e) { continue; }
  if (Array.isArray(d) && d.length === 1810) curTable = d;
}
console.log('current translated table loaded:', !!curTable);

const probes = ['SETTINGS', 'BACK', 'GAME', 'GRAPHICS', 'AUDIO', 'TUTORIAL', 'PLAYER NAME', 'CONTINUE',
  'NEW GAME', 'END SHIFT', 'DAILY ORDERS', 'WAR DIARY', 'OPTIONS', 'MAIN MENU', 'EXIT'];
for (const p of probes) {
  const hit = orig.filter(([k, v]) => String(v).trim().toUpperCase() === p);
  const strgHits = strgRows.filter(r => r.s.replace(/\r/g, '').trim().toUpperCase() === p);
  console.log(`\n== "${p}"`);
  if (hit.length) {
    for (const [k, v] of hit) {
      const curV = curTable ? (curTable.find(e => e[0] === k) || [])[1] : '?';
      console.log(`   CSV key=${k}  EN=${JSON.stringify(String(v).slice(0, 60))}  CN=${JSON.stringify(String(curV).slice(0, 40))}`);
    }
  } else console.log('   CSV: (no exact value match)');
  console.log(`   STRG idx: ${strgHits.map(h => h.idx).join(', ') || '(none)'}`);
}
