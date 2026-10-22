// Patch the baked base64+zlib localization blobs inside False Echo.exe, IN PLACE
// (same byte length) so that no string-pool offsets shift.
//
// Why same length matters: the YYC exe keeps all string literals in one
// contiguous, 8-byte-aligned pool; compiled code refers to them by offset.
// A shorter payload is padded with base64 groups that decode to spaces
// ("ICAg" -> 3 spaces), which JSON parsers tolerate as trailing whitespace.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const exePath = process.argv[2];
const apply = process.argv[3] === '--apply';
const outPath = process.argv[4] || exePath;

const buf = fs.readFileSync(exePath);
const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
// blob index -> exe base64 string
const blobIdxToExe = { 2575: 'Endless', 2576: 'Rules', 2577: 'FrontlineNews', 2578: 'Localization', 2579: 'WarDiary' };

// locate the original base64 strings in the exe via the original data.win STRG
const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}

function findAll(haystack, needle) {
  const hits = [];
  let p = 0;
  while (true) {
    p = haystack.indexOf(needle, p);
    if (p < 0) break;
    hits.push(p);
    p++;
  }
  return hits;
}

const out = Buffer.from(buf);
let changed = 0;

for (const idx of [2575, 2576, 2577, 2578, 2579]) {
  const origB64 = strg.get(idx).trim();
  const hits = findAll(buf, origB64);
  if (hits.length === 0) { console.log(`!! blob ${idx}: original base64 not found in exe`); continue; }
  // slot length: from blob start to the next NUL
  const slotLen = buf.indexOf(0, hits[0]) - hits[0];
  const exeB64 = buf.toString('latin1', hits[0], hits[0] + slotLen);
  const exePlain = zlib.inflateSync(Buffer.from(exeB64, 'base64')).toString('utf8');
  const ourPlain = cur[String(idx)];
  const sameContent = exePlain === ourPlain;
  const origPlainLen = exePlain.length;

  // build the new payload; tune so compressed length % 3 == 0 (no '=' in base64)
  let newZ = null, newB64 = null, pad = 0, plain = null;
  for (let extra = 0; extra < 64; extra++) {
    plain = ourPlain + (extra ? ' '.repeat(extra) : '');
    const z = zlib.deflateSync(Buffer.from(plain, 'utf8'), { level: 9 });
    if (z.length % 3 === 0) { newZ = z; break; }
  }
  if (!newZ) { console.log(`!! blob ${idx}: cannot align compressed length to %3==0`); continue; }
  newB64 = zlib.deflateSync(Buffer.from(ourPlain, 'utf8'), { level: 9 }).toString('base64');
  // recompute with the aligned payload
  newB64 = Buffer.from(newZ).toString('base64');
  if (newB64.length > slotLen) {
    console.log(`!! blob ${idx}: new base64 ${newB64.length} > slot ${slotLen}`);
    continue;
  }
  const diff = slotLen - newB64.length;
  if (diff % 4 !== 0) { console.log(`!! blob ${idx}: padding diff ${diff} not multiple of 4`); continue; }
  const filler = 'ICAg'.repeat(diff / 4);   // decodes to spaces
  const finalB64 = newB64 + filler;
  // sanity: decompress the first newB64 part
  const check = zlib.inflateSync(Buffer.from(newB64, 'base64')).toString('utf8');
  const checkOk = check.trim() === ourPlain.trim();
  console.log(`blob ${idx} (${blobIdxToExe[idx]}): slot=${slotLen} new=${newB64.length} pad=${diff} sameAsDataWin=${sameContent ? 'yes' : 'NO'} roundtrip=${checkOk ? 'ok' : 'FAIL'}`);
  if (!checkOk) continue;
  for (const h of hits) {
    out.write(finalB64, h, 'latin1');
    changed++;
  }
}

console.log(`\npatched ${changed} blob occurrence(s). apply=${apply}`);
if (apply) {
  fs.writeFileSync(outPath, out);
  console.log(`written -> ${outPath} (${out.length} bytes)`);
}
