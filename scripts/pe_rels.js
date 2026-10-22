// Analyse: PE layout, blob slots, and the single RIP-relative reference that
// points at each blob. Everything needed to build the relocation patch.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const exePath = process.argv[2] || path.join(root, 'backup_original', 'False Echo.exe');
const buf = fs.readFileSync(exePath);

const peOff = buf.readUInt32LE(0x3C);
const optSize = buf.readUInt16LE(peOff + 20);
const numSections = buf.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const imageBase = buf.readBigUInt64LE(peOff + 24 + 24);
const fileAlignment = buf.readUInt32LE(peOff + 24 + 60);
const sectionAlignment = buf.readUInt32LE(peOff + 24 + 32);
const sizeOfImage = buf.readUInt32LE(peOff + 24 + 56);
const sizeOfHeaders = buf.readUInt32LE(peOff + 24 + 60);

console.log('file            = 0x' + buf.length.toString(16), '(' + buf.length + ')');
console.log('peOff           = 0x' + peOff.toString(16));
console.log('secOff          = 0x' + secOff.toString(16));
console.log('numSections     = ' + numSections);
console.log('ImageBase       = 0x' + imageBase.toString(16));
console.log('SectionAlign    = 0x' + sectionAlignment.toString(16));
console.log('FileAlignment   = 0x' + fileAlignment.toString(16));
console.log('SizeOfImage     = 0x' + sizeOfImage.toString(16));
console.log('SizeOfHeaders   = 0x' + sizeOfHeaders.toString(16));
console.log('section table end= 0x' + (secOff + numSections * 40).toString(16));

const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({
    i, hdrOff: o,
    name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''),
    vsize: buf.readUInt32LE(o + 8), vaddr: buf.readUInt32LE(o + 12),
    rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20),
    chars: buf.readUInt32LE(o + 36),
  });
}
function toRva(fo) { for (const s of secs) if (fo >= s.rawptr && fo < s.rawptr + s.rawsize) return s.vaddr + (fo - s.rawptr); return null; }
function toFile(rva) { for (const s of secs) if (rva >= s.vaddr && rva < s.vaddr + Math.max(s.vsize, s.rawsize)) return s.rawptr + (rva - s.vaddr); return null; }

for (const s of secs) {
  console.log(`  [${s.i}] ${s.name.padEnd(9)} hdr=0x${s.hdrOff.toString(16)} vaddr=0x${s.vaddr.toString(16)} vsize=0x${s.vsize.toString(16)} rawptr=0x${s.rawptr.toString(16)} rawsize=0x${s.rawsize.toString(16)} end=0x${(s.rawptr + s.rawsize).toString(16)} chars=0x${s.chars.toString(16)}`);
}
// gaps / holes
console.log('\nraw coverage:');
let cursor = sizeOfHeaders;
for (const s of secs) {
  if (s.rawptr > cursor) console.log(`  HOLE 0x${cursor.toString(16)} .. 0x${s.rawptr.toString(16)}  (${s.rawptr - cursor} bytes)`);
  cursor = Math.max(cursor, s.rawptr + s.rawsize);
}
console.log(`  file end = 0x${cursor.toString(16)} (file size 0x${buf.length.toString(16)})`);
if (cursor < buf.length) console.log(`  TAIL   0x${cursor.toString(16)} .. 0x${buf.length.toString(16)}`);

// ---- blob slots -------------------------------------------------------
const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}
function findAll(hay, needle) { const hits = []; let p = 0; while ((p = hay.indexOf(needle, p)) >= 0) { hits.push(p); p++; } return hits; }

// RIP-relative scan inside .text for a given file offset
function ripRefs(fileOff) {
  const rva = toRva(fileOff);
  if (rva === null) return [];
  const out = [];
  for (const s of secs) {
    if (s.name !== '.text') continue;
    for (let q = s.rawptr; q < s.rawptr + s.rawsize - 4; q++) {
      const disp = buf.readInt32LE(q);
      const nextRva = toRva(q + 4);
      if (nextRva === null) continue;
      if ((nextRva + disp) === rva) out.push(q);
    }
  }
  return out;
}

console.log('\n=== baked blobs ===');
const names = { 2575: 'Endless', 2576: 'Rules', 2577: 'FrontlineNews', 2578: 'Localization', 2579: 'WarDiary' };
for (const idx of [2575, 2576, 2577, 2578, 2579]) {
  const origB64 = (strg.get(idx) || '').trim();
  const hits = findAll(buf, origB64);
  if (!hits.length) { console.log(`${idx} ${names[idx]}: NOT FOUND`); continue; }
  for (const h of hits) {
    const slotLen = buf.indexOf(0, h) - h;
    const rva = toRva(h);
    const refs = ripRefs(h);
    console.log(`${idx} ${names[idx]}: fileOff=0x${h.toString(16)} slotLen=${slotLen} rva=0x${rva && rva.toString(16)} ripRefs=${refs.length} ${refs.map(x => '0x' + x.toString(16)).join(',')}`);
  }
}

// ---- new section plan -------------------------------------------------
const last = secs[secs.length - 1];
const align = (v, a) => Math.ceil(v / a) * a;
const newVaddr = align(last.vaddr + last.vsize, sectionAlignment);
console.log('\nnew section candidate: vaddr=0x' + newVaddr.toString(16) + ' rawptr=0x' + align(buf.length, fileAlignment).toString(16) + ' hdrOff=0x' + (secOff + numSections * 40).toString(16));
console.log('  SizeOfImage would be 0x' + align(newVaddr + 0x1000, sectionAlignment).toString(16));
