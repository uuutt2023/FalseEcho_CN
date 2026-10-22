// Minimal data.win reader: locate STRG chunk, dump a string index, decode base64+zlib blobs.
const fs = require('fs');
const zlib = require('zlib');

function readChunks(buf) {
  // GameMaker chunk: id(4 ascii) | length(u32) | offset(u32 from dataStart) | size(u32)
  // dataStart is 4 bytes into the file
  const chunks = {};
  let p = 4;
  const dataStart = 4;
  while (p + 16 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    if (!/^[A-Z]{4}$/.test(id)) break;
    const length = buf.readUInt32LE(p + 4);
    const offset = buf.readUInt32LE(p + 8);
    const size = buf.readUInt32LE(p + 12);
    chunks[id] = { length, offset, size };
    p += 16;
  }
  return { chunks, dataStart };
}

function readStrg(buf, chunk) {
  const base = chunk.offset;                 // relative to dataStart
  const count = buf.readUInt32LE(base);
  const offs = [];
  for (let i = 0; i < count; i++) offs.push(buf.readUInt32LE(base + 4 + i * 4));
  const strings = [];
  for (let i = 0; i < count; i++) {
    const start = base + offs[i];
    const end = (i + 1 < count) ? base + offs[i + 1] : base + chunk.size;
    strings.push(buf.toString('utf8', start, end).replace(/\0+$/, ''));
  }
  return strings;
}

const file = process.argv[2];
const idxs = process.argv.slice(3).map(Number);
const buf = fs.readFileSync(file);
const { chunks } = readChunks(buf);
console.log('chunks:', Object.keys(chunks).join(','));
const strg = readStrg(buf, chunks.STRG);
console.log('STRG count:', strg.length);
for (const i of idxs) {
  let s = strg[i];
  if (s === undefined) { console.log(i, '<out of range>'); continue; }
  const isB64 = /^[A-Za-z0-9+/=]{200,}$/.test(s.trim());
  if (isB64) {
    try {
      const dec = zlib.inflateSync(Buffer.from(s.trim(), 'base64')).toString('utf8');
      console.log(`${i}  [BLOB decoded ${dec.length} chars] ${JSON.stringify(dec.slice(0, 300))}`);
    } catch (e) { console.log(`${i}  [BLOB inflate failed: ${e.message}] head=${JSON.stringify(s.slice(0, 60))}`); }
  } else {
    console.log(`${i}  ${JSON.stringify(s.slice(0, 300))}`);
  }
}
