// Scan a binary for every zlib stream and dump inflated text matches.
const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];
const needles = (process.argv[3] || 'Tribunal,uutt,Mocas,Guutt').split(',');
const buf = fs.readFileSync(file);
console.log(`${file}: ${buf.length} bytes`);

const sigs = [0x78];
let hits = 0;
const out = [];
for (let i = 0; i < buf.length - 6; i++) {
  if (buf[i] !== 0x78) continue;
  const cmf = buf[i], flg = buf[i + 1];
  if ((cmf & 0x0f) !== 8) continue;
  if (((cmf << 8) | flg) % 31 !== 0) continue;
  if (flg & 0x20) continue; // preset dict
  try {
    const outBuf = zlib.inflateSync(buf.subarray(i), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    if (outBuf.length < 64) continue;
    const s = outBuf.toString('utf8');
    const found = needles.filter((n) => s.toLowerCase().includes(n.toLowerCase()));
    if (found.length) {
      hits++;
      out.push({ off: i, len: outBuf.length, found });
      const idx = Math.max(0, s.toLowerCase().indexOf(found[0].toLowerCase()) - 200);
      console.log(`  HIT @0x${i.toString(16)} inflated=${outBuf.length} [${found.join(',')}]`);
      console.log('    ' + JSON.stringify(s.slice(idx, idx + 500)));
    }
  } catch (e) { /* not a valid stream at this offset */ }
}
console.log(`total hits: ${hits}`);
