const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
function rows(id) {
  const raw = blobs[String(id)];
  try { return JSON.parse(raw.replace(/[\u0000]+$/, '').trimEnd()); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
const want = process.argv.slice(2);
for (const id of [2575, 2576, 2577, 2578, 2579]) {
  for (const r of rows(id)) {
    if (!Array.isArray(r)) continue;
    if (want.includes(String(r[0]))) console.log(`block ${id} [${JSON.stringify(r[0])}] = ${JSON.stringify(r.slice(1)).slice(0, 400)}`);
  }
}
