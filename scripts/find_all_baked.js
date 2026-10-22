// Find EVERY baked JSON blob in the exe: scan the string pool for items that
// parse as a JSON object/array, and map them to the data.win STRG blobs.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));

// 1) pool items that are baked base64 (long base64-looking ASCII) and decode to JSON
const baked = [];
for (const it of items) {
  if (it.s.length < 200) continue;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(it.s)) continue;
  let dec;
  try { dec = zlib.inflateSync(Buffer.from(it.s, 'base64')).toString('utf8'); } catch { continue; }
  let parsed; try { parsed = JSON.parse(dec.replace(/[\u0000]+/g, '').trim()); } catch { continue; }
  baked.push({ off: it.off, len: it.s.length, bytes: dec.length, parsed });
}
console.log(`baked JSON blobs found in exe pool: ${baked.length}`);
for (const b of baked) {
  const p = b.parsed;
  const kind = Array.isArray(p) ? `array(${p.length})` : `object(${Object.keys(p).length})`;
  const head = Array.isArray(p) ? JSON.stringify(p[0]).slice(0, 90) : JSON.stringify(Object.keys(p).slice(0, 5));
  console.log(`  0x${b.off.toString(16)} base64len=${b.len} jsonbytes=${b.bytes} ${kind}`);
  console.log(`      ${head}`);
}

// 2) match each baked blob against the data.win STRG blobs by content
console.log('\n--- matching baked blobs to data.win STRG blob_XXXX.json:');
for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const found = baked.find(b => b.bytes === Buffer.byteLength(txt, 'utf8') &&
    (b.bytes < 200 ? true : JSON.stringify(b.parsed) === txt));
  console.log(`  blob ${i}: ${found ? 'BAKED in exe @ 0x' + found.off.toString(16) : 'not baked (data.win only)'}`);
}
