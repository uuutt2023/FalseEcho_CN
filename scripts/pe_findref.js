// How does the YYC exe reference its string pool? Search .text for the
// address of a known pool string (the localization base64 blob).
const fs = require('fs');
const file = process.argv[2];
const targetFileOff = parseInt(process.argv[3], 16);   // file offset of the string
const buf = fs.readFileSync(file);

const peOff = buf.readUInt32LE(0x3C);
const optSize = buf.readUInt16LE(peOff + 20);
const numSections = buf.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const magic = buf.readUInt16LE(peOff + 24);
const imageBase = magic === 0x20b ? buf.readBigUInt64LE(peOff + 24 + 24) : BigInt(buf.readUInt32LE(peOff + 24 + 28));
console.log('magic 0x' + magic.toString(16) + ' ImageBase 0x' + imageBase.toString(16));

const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({
    name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''),
    vsize: buf.readUInt32LE(o + 8), vaddr: buf.readUInt32LE(o + 12),
    rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20),
  });
}
function toRva(fileOff) {
  for (const s of secs) if (fileOff >= s.rawptr && fileOff < s.rawptr + s.rawsize) return s.vaddr + (fileOff - s.rawptr);
  return null;
}
const rva = toRva(targetFileOff);
const va = imageBase + BigInt(rva);
console.log('string fileOff 0x' + targetFileOff.toString(16) + '  rva=0x' + rva.toString(16) + '  va=0x' + va.toString(16));

// 1) 4-byte RVA immediates anywhere
function find32(val, from, to) {
  const hits = [];
  const pat = Buffer.alloc(4); pat.writeUInt32LE(val >>> 0);
  let p = from;
  while (p < to) {
    p = buf.indexOf(pat, p);
    if (p < 0 || p >= to) break;
    hits.push(p); p++;
  }
  return hits;
}
const text = secs.find(s => s.name === '.text');
const rdata = secs.find(s => s.name === '.rdata');
console.log('\n[1] 4-byte RVA immediates in .text:');
const h1 = find32(rva, text.rawptr, text.rawptr + text.rawsize);
console.log('   ', h1.length, 'hit(s)', h1.slice(0, 20).map(x => '0x' + x.toString(16)));
console.log('[2] 4-byte RVA immediates in .rdata:');
const h2 = find32(rva, rdata.rawptr, rdata.rawptr + rdata.rawsize);
console.log('   ', h2.length, 'hit(s)', h2.slice(0, 20).map(x => '0x' + x.toString(16)));
console.log('[3] 8-byte VA in .text:');
const pat8 = Buffer.alloc(8); pat8.writeBigUInt64LE(va);
let p = text.rawptr, h3 = [];
while (p < text.rawptr + text.rawsize) {
  p = buf.indexOf(pat8, p);
  if (p < 0 || p >= text.rawptr + text.rawsize) break;
  h3.push(p); p++;
}
console.log('   ', h3.length, 'hit(s)', h3.slice(0, 20).map(x => '0x' + x.toString(16)));

// 4) look for a table of u32 RVAs inside .rdata that point into the pool
//    (table = >=8 consecutive u32, increasing, all pointing into .rdata)
const poolStart = rdata.rawptr, poolEnd = rdata.rawptr + rdata.rawsize;
let best = null;
for (let start = rdata.rawptr; start < rdata.rawptr + rdata.rawsize - 32; start += 4) {
  let cnt = 0, prev = -1, ok = true;
  for (let k = 0; k < 12; k++) {
    const v = buf.readUInt32LE(start + k * 4);
    const rr = toRva(start + k * 4) ;
    // value must be an RVA into .rdata
    const sec = secs.find(s => v >= s.vaddr && v < s.vaddr + s.vsize);
    if (!sec || sec.name !== '.rdata') { ok = false; break; }
    if (prev >= 0 && v < prev) { ok = false; break; }
    prev = v; cnt++;
  }
  if (ok && cnt >= 12) { best = { start, cnt }; break; }
}
console.log('[4] candidate ascending RVA table in .rdata:', best ? `0x${best.start.toString(16)}` : 'none found');
