const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('apply/blobs.json', 'utf8'));
const node = JSON.parse(raw['2566'].replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+$/, ''));
const keys = Object.keys(node);
console.log('blob2566 top keys:', keys.length);
for (const k of keys) {
  const v = node[k];
  const s = JSON.stringify(v);
  console.log('--- ' + k + ' : ' + s.slice(0, 240));
}
