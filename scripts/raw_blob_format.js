// Decode the ORIGINAL baked blobs and show their RAW decompressed bytes,
// so we know the exact wire format (CSV text vs JSON).
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}

for (const idx of [2560, 2564, 2575, 2576, 2577, 2578, 2579]) {
  const s = strg.get(idx) || '';
  try {
    const dec = zlib.inflateSync(Buffer.from(s.trim(), 'base64'));
    const head = dec.toString('utf8').slice(0, 220).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    console.log(`\n--- STRG ${idx}: raw ${dec.length} bytes, b64 ${s.length} chars ---`);
    console.log(head);
  } catch (e) { console.log(`${idx}: FAIL ${e.message}`); }
}
