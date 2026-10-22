// Deeper: how is the pool string referenced? 8-byte VA in .rdata? offset table?
const fs = require('fs');
const file = process.argv[2];
const targetFileOff = parseInt(process.argv[3], 16);
const buf = fs.readFileSync(file);
const peOff = buf.readUInt32LE(0x3C);
const optSize = buf.readUInt16LE(peOff + 20);
const numSections = buf.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const imageBase = buf.readBigUInt64LE(peOff + 24 + 24);
const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({ name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''), vsize: buf.readUInt32LE(o + 8), vaddr: buf.readUInt32LE(o + 12), rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20) });
}
function toRva(fo) { for (const s of secs) if (fo >= s.rawptr && fo < s.rawptr + s.rawsize) return s.vaddr + (fo - s.rawptr); return null; }
const rva = toRva(targetFileOff);
const va = imageBase + BigInt(rva);

// A) 8-byte VA anywhere in the file
const pat8 = Buffer.alloc(8); pat8.writeBigUInt64LE(va);
let p = 0, hits = [];
while (p < buf.length) { p = buf.indexOf(pat8, p); if (p < 0) break; hits.push(p); p++; }
console.log('8-byte VA hits:', hits.length, hits.slice(0, 10).map(x => '0x' + x.toString(16)));

// B) 4-byte RVA anywhere
const pat4 = Buffer.alloc(4); pat4.writeUInt32LE(rva >>> 0);
p = 0; hits = [];
while (p < buf.length) { p = buf.indexOf(pat4, p); if (p < 0) break; hits.push(p); p++; }
console.log('4-byte RVA hits:', hits.length, hits.slice(0, 10).map(x => '0x' + x.toString(16)));

// C) the ascending-RVA table candidate: print entries, look for our rva
const T = parseInt(process.argv[4] || '2e09238', 16);
console.log('\ntable @0x' + T.toString(16) + ' first 24 u32:');
for (let k = 0; k < 24; k++) console.log('  +' + (k * 4) + '  0x' + buf.readUInt32LE(T + k * 4).toString(16));
// does the table contain our rva anywhere nearby?
let found = -1;
for (let k = 0; k < 200000; k++) { if (buf.readUInt32LE(T + k * 4) === rva) { found = k; break; } }
console.log('our rva found at table offset +' + (found * 4) + ' (index ' + found + ')');

// D) RIP-relative references in .text: scan for disp32 that resolves to the target
const text = secs.find(s => s.name === '.text');
let rip = [];
for (let q = text.rawptr; q < text.rawptr + text.rawsize - 4; q++) {
  const disp = buf.readInt32LE(q);
  const nextRva = toRva(q + 4);
  if (nextRva === null) continue;
  if ((nextRva + disp) === rva) rip.push(q);
}
console.log('\nRIP-relative disp32 hits in .text:', rip.length, rip.slice(0, 20).map(x => '0x' + x.toString(16)));
