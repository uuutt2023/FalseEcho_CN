// inventory_crlf2.js — 盘点 blobs.json 各块内含 CRLF 的条目（按块/键分组）
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('apply/blobs.json', 'utf8'));
const groups = {};
for (const blobId of Object.keys(b)) {
  let s = b[blobId].replace(/\0+$/, '');
  let t;
  try { t = JSON.parse(s); } catch (e) { const i = s.lastIndexOf(']'); t = JSON.parse(s.slice(0, i + 1)); }
  const arr = Array.isArray(t) ? t : (t && t.rows) || [];
  for (const pair of arr) {
    if (!Array.isArray(pair)) continue;
    const key = String(pair[0]);
    const val = pair[1];
    if (typeof val !== 'string' || val.indexOf('\r\n') < 0) continue;
    const g = key.replace(/[0-9]+$/, '').replace(/_+$/, '');
    if (!groups[g]) groups[g] = { blob: blobId, n: 0, lines: 0, sample: '' };
    groups[g].n++;
    groups[g].lines += val.split('\r\n').length;
    if (!groups[g].sample) groups[g].sample = val.slice(0, 70).replace(/\r\n/g, '\\n');
  }
}
const ents = Object.entries(groups).sort((a, b) => b[1].lines - a[1].lines);
for (const [g, v] of ents) console.log(`blob${v.blob} ${g.padEnd(30)} count=${String(v.n).padStart(4)} lines=${String(v.lines).padStart(4)}  ${v.sample}`);
