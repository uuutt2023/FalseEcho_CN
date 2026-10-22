// Inspect the bytes around a file offset inside .text to decide whether the
// 4-byte value there is a genuine RIP-relative disp32.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const buf = fs.readFileSync(path.join(root, 'out', 'FalseEcho_cn.exe'));
const pe = buf.readUInt32LE(0x3C);
const optSize = buf.readUInt16LE(pe + 20);
const n = buf.readUInt16LE(pe + 6);
const so = pe + 24 + optSize;
const secs = [];
for (let i = 0; i < n; i++) {
  const o = so + i * 40;
  secs.push({ name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''), vaddr: buf.readUInt32LE(o + 12), rawptr: buf.readUInt32LE(o + 20), rawsize: buf.readUInt32LE(o + 16) });
}
const text = secs.find(s => s.name === '.text');

const offsets = process.argv.slice(2).map(x => parseInt(x, 16));
for (const q of offsets) {
  const ctx = buf.slice(q - 10, q + 8);
  console.log(`@0x${q.toString(16)} inText=${q >= text.rawptr && q < text.rawptr + text.rawsize}`);
  console.log(`   bytes[-10..+8]: ${ctx.toString('hex')}`);
  for (let back = 1; back <= 4; back++) {
    const p = q - back;
    const modrm = buf[p];
    const isRip = (modrm & 0xC7) === 0x05;   // mod=00 r/m=101 -> RIP-relative
    console.log(`   back=${back} modrm=0x${modrm.toString(16)} ripRelative=${isRip} opBefore=0x${buf[p - 1].toString(16)}`);
  }
}
