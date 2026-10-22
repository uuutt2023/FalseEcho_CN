const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));

function rows(id) {
  const raw = blobs[String(id)];
  if (!raw) return [];
  try { return JSON.parse(raw.replace(/[\u0000]+$/, '').trimEnd()); }
  catch (e) {
    const out = [];
    for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} }
    return out;
  }
}

const probes = process.argv.slice(2);
for (const id of [2575, 2576, 2577, 2578, 2579]) {
  for (const r of rows(id)) {
    if (!Array.isArray(r)) continue;
    for (let c = 0; c < r.length; c++) {
      const v = String(r[c]);
      if (probes.some(p => v.toUpperCase().includes(p.toUpperCase()))) {
        console.log(`block ${id} row[${r[0]}] col${c}: ${JSON.stringify(v).slice(0, 220)}`);
      }
    }
  }
}
