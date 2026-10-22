// Inspect data.win STRG blobs 2560..2574: what are they?
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
for (let i = 2560; i <= 2574; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) { console.log(i, 'missing'); continue; }
  const s = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  let v;
  try { v = JSON.parse(s); } catch (e) { console.log(i, 'UNPARSED', s.length, JSON.stringify(s.slice(0, 100))); continue; }
  if (Array.isArray(v)) {
    console.log(`--- ${i}: array(${v.length})`);
    console.log('   ', JSON.stringify(v[0]).slice(0, 220));
  } else {
    const ks = Object.keys(v);
    console.log(`--- ${i}: object(${ks.length})`);
    console.log('   ', ks.slice(0, 6).map(k => `${k}=${JSON.stringify(v[k]).slice(0, 90)}`).join('\n    '));
  }
}
