// scan_strg.js —— 正确遍历 data.win 的 chunk 表，扫描 STRG 中所有含本地化键的条目
const fs = require('fs');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const file = process.argv[2] || (root + '/backup_original/data.win');
const KEY = process.argv[3] || 'txt_mm_press_any_key_start';
const buf = fs.readFileSync(file);

// FORM 头: "FORM"(4) size(4) "DATA"(4) 然后是 12 字节一个的 chunk 头表
if (buf.toString('latin1', 0, 4) !== 'FORM') { console.log('not a FORM'); process.exit(1); }
let p = 12;
const chunks = [];
while (p + 12 <= buf.length) {
  const id = buf.toString('latin1', p, p + 4);
  if (!/^[A-Z0-9]{4}$/.test(id)) break;
  const size = buf.readUInt32LE(p + 4);
  const off = buf.readUInt32LE(p + 8);
  if (off + size > buf.length) break;
  chunks.push({ id, size, off });
  p += 12;
}
console.log('chunks:', chunks.length, chunks.map(c => c.id).join(','));
const strg = chunks.find(c => c.id === 'STRG');
if (!strg) { console.log('no STRG'); process.exit(1); }
const count = buf.readUInt32LE(strg.off);
console.log('STRG entries:', count);
let hits = 0;
for (let i = 0; i < count; i++) {
  const so = buf.readUInt32LE(strg.off + 4 + i * 4);
  let end = so;
  while (end < strg.size && buf[strg.off + end] !== 0) end++;
  const s = buf.toString('utf8', strg.off + so, strg.off + end);
  if (s.length < 20) continue;
  let dec = null;
  if (/^[A-Za-z0-9+/=]+$/.test(s)) {
    try { dec = zlib.inflateSync(Buffer.from(s, 'base64')).toString('utf8'); } catch (e) { }
  }
  if (dec !== null && dec.indexOf(KEY) >= 0) {
    hits++;
    const j = dec.indexOf(KEY);
    console.log('  STRG[' + i + ']: ' + JSON.stringify(dec.slice(j - 12, j + 46)));
  } else if (s.indexOf(KEY) >= 0) {
    hits++;
    console.log('  STRG[' + i + '] (plain): ' + JSON.stringify(s.slice(0, 80)));
  }
}
console.log('hits:', hits);
