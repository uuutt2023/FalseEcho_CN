// Extract every long base64 blob from the exe string pool and match it against
// the original data.win STRG 2560..2579 blobs.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

// --- original data.win blobs (base64 strings) ---
const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}
const dw = new Map();
for (let i = 2560; i <= 2579; i++) dw.set(strg.get(i), i);

const exe = fs.readFileSync(process.argv[2]);
// scan for runs of base64 chars >= 400 long
const re = /[A-Za-z0-9+/]{400,}={0,2}/g;
let m, n = 0;
const found = [];
while ((m = re.exec(exe.toString('latin1'))) !== null) {
  const s = m[0];
  const off = m.index;
  let info = 'unmatched';
  if (dw.has(s)) info = 'data.win STRG ' + dw.get(s);
  else {
    try {
      const dec = zlib.inflateSync(Buffer.from(s, 'base64')).toString('utf8');
      const head = dec.slice(0, 90).replace(/\n/g, ' ');
      info = 'decoded ' + dec.length + 'B :: ' + head;
    } catch (e) { info = 'no-match(len ' + s.length + ')'; }
  }
  found.push({ off, len: s.length, info });
  n++;
}
console.log('base64 runs found in exe:', n);
for (const f of found) console.log(`  @0x${f.off.toString(16)} len=${f.len}  ${f.info}`);
