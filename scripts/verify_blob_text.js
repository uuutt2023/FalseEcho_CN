// Verify that the data.win STRG copy of each blob round-trips to exactly the
// same text as the base64+zlib payload baked into the exe.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';

const exe = fs.readFileSync(path.join(root, 'backup_original', 'False Echo.exe'));

// locate every baked blob: pool strings that are base64 and inflate to JSON
const { loadPool } = require('./exepool.js');
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const baked = [];
for (const it of items) {
  if (it.s.length < 100) continue;
  if (!/^[A-Za-z0-9+/=]+$/.test(it.s)) continue;
  let dec;
  try { dec = zlib.inflateSync(Buffer.from(it.s, 'base64')); } catch { continue; }
  let parsed; try { parsed = JSON.parse(dec.toString('utf8').replace(/\u0000+$/, '').trim()); } catch { continue; }
  baked.push({ off: it.off, dec, parsed, b64len: it.s.length });
}
console.log(`baked blobs: ${baked.length}`);

let ok = 0, bad = 0;
for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) { console.log(`${i}: no extraction`); continue; }
  const src = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const round = JSON.stringify(JSON.parse(src));
  const match = baked.find(b => b.dec.toString('utf8').replace(/\u0000+$/, '').trim() === round);
  const exact = baked.find(b => b.dec.toString('utf8').replace(/\u0000+$/, '').trim() === src);
  if (match) {
    ok++;
    console.log(`${i}: MATCH  baked@0x${match.off.toString(16)}  bytes=${match.dec.length}  b64=${match.b64len}  trailingNUL=${match.dec[match.dec.length-1] === 0 ? 'yes' : 'no'}  exactSameText=${exact ? 'yes' : 'no'}`);
  } else {
    bad++;
    console.log(`${i}: *** NO MATCH *** srcLen=${src.length} roundLen=${round.length}`);
  }
}
console.log(`\nmatched ${ok}, unmatched ${bad}`);
