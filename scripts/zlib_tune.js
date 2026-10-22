// Brute-force zlib settings to squeeze the localized tables back into the
// original exe string slots (the game only needs a valid zlib stream).
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
const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const names = { 2575: 'Endless', 2576: 'Rules', 2577: 'FrontlineNews', 2578: 'Localization', 2579: 'WarDiary' };

const strategies = [
  ['DEFAULT', zlib.constants.Z_DEFAULT_STRATEGY],
  ['FILTERED', zlib.constants.Z_FILTERED],
  ['HUFFMAN', zlib.constants.Z_HUFFMAN_ONLY],
  ['RLE', zlib.constants.Z_RLE],
  ['FIXED', zlib.constants.Z_FIXED],
];

for (const idx of [2575, 2576, 2577, 2578, 2579]) {
  const oldB64 = strg.get(idx).trim();
  const slot = oldB64.length;
  const oldZ = zlib.inflateSync(Buffer.from(oldB64, 'base64')).length;
  const text = cur[String(idx)];
  const buf = Buffer.from(text, 'utf8');
  let best = null;
  for (const level of [9, 8, 7, 6]) {
    for (const memLevel of [9, 8]) {
      for (const [sname, strat] of strategies) {
        let z;
        try { z = zlib.deflateSync(buf, { level, memLevel, strategy: strat }); } catch (e) { continue; }
        if (!best || z.length < best.len) best = { len: z.length, level, memLevel, sname };
      }
    }
  }
  // also: try the same but with the JSON pretty/compact variations and trailing-space tuning
  const b64len = Math.ceil(best.len / 3) * 4;
  console.log(`${idx} ${names[idx].padEnd(14)} slot=${String(slot).padStart(6)} (old zlib ${String(oldZ).padStart(7)})  best zlib=${String(best.len).padStart(6)} (${best.level}/${best.memLevel}/${best.sname}) -> b64 ${String(b64len).padStart(6)}  ${b64len <= slot ? 'FITS (+' + (slot - b64len) + ')' : 'over by ' + (b64len - slot)}`);
}
