// Locate STRG chunk by scanning for the ASCII tag, then dump/decode strings.
const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];
const buf = fs.readFileSync(file);
console.log('file size', buf.length);

const hits = [];
for (let p = 0; p + 16 <= buf.length; p += 4) {
  if (buf.toString('ascii', p, p + 4) === 'STRG') {
    const length = buf.readUInt32LE(p + 4);
    const a = buf.readUInt32LE(p + 8);
    const b = buf.readUInt32LE(p + 12);
    hits.push({ p, length, a, b });
  }
}
console.log('STRG tag hits:', JSON.stringify(hits));

// In GM2 the chunk table lives at the end of the file: [id,len,off,size]*
// try parsing the tail backwards from the "DONE" marker
const doneIdx = buf.lastIndexOf('DONE', buf.length - 16);
console.log('DONE at', doneIdx);

// Try every STRG hit as a chunk-table entry
for (const h of hits) {
  const base = h.a, size = h.b;
  if (base + size > buf.length) { console.log(`  @${h.p}: base+size overflow`); continue; }
  if (size < 8) { console.log(`  @${h.p}: size too small`); continue; }
  const count = buf.readUInt32LE(base);
  if (count < 1000 || count > 100000) { console.log(`  @${h.p}: implausible count ${count}`); continue; }
  console.log(`  @${h.p}: length=${h.length} base=${base} size=${size} count=${count}`);
}
