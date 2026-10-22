// Can the baked base64 blobs in the EXE be replaced in-place (same or shorter)?
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const exe = process.argv[2];
const buf = fs.readFileSync(exe);

// locate each baked blob by its base64 prefix from the ORIGINAL data.win
const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}

const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const names = { 2575: 'Endless', 2576: 'Rules', 2577: 'FrontlineNews', 2578: 'Localization', 2579: 'WarDiary' };

console.log('idx  name            old_b64   old_zlib   new_b64   new_zlib   fits_in_place?');
for (const idx of [2575, 2576, 2577, 2578, 2579]) {
  const oldB64 = strg.get(idx).trim();
  const newText = cur[String(idx)];
  const newRaw = Buffer.from(newText, 'utf8');
  // try several zlib levels; also try raw deflate variants
  let best = null;
  for (const level of [9, 8, 6]) {
    const z = zlib.deflateSync(newRaw, { level });
    if (!best || z.length < best.length) best = z;
  }
  const newB64 = zlib.deflateSync(newRaw, { level: 9 });
  console.log(
    `${idx}  ${names[idx].padEnd(15)} ${String(oldB64.length).padStart(7)}  ${String(zlib.inflateSync(Buffer.from(oldB64,'base64')).length).padStart(8)}  ` +
    `${String(newB64.length).padStart(8)}  ${String(newRaw.length).padStart(8)}   ` +
    (newB64.length <= oldB64.length ? 'YES  (+' + (oldB64.length - newB64.length) + ' spare)' : 'NO  (+' + (newB64.length - oldB64.length) + ' over)'));
}
