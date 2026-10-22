// count_refs.js —— 统计 exe 字符串池中某个偏移被 RIP 相对引用了多少次
// 显示文案通常只有 1 处引用；变量名/结构体成员名往往多处引用
const fs = require('fs');
const src = fs.readFileSync('E:/FalseEcho_CN/backup_original/False Echo.exe');
const peOff = src.readUInt32LE(0x3C);
const optSize = src.readUInt16LE(peOff + 20);
const secOff = peOff + 24 + optSize;
const n = src.readUInt16LE(peOff + 6);
const secs = [];
for (let i = 0; i < n; i++) {
  const o = secOff + i * 40;
  secs.push({
    name: src.toString('ascii', o, o + 8).replace(/\0+$/, ''),
    vaddr: src.readUInt32LE(o + 12),
    rawsize: src.readUInt32LE(o + 16),
    rawptr: src.readUInt32LE(o + 20),
  });
}
function toRva(fo) { for (const s of secs) if (fo >= s.rawptr && fo < s.rawptr + s.rawsize) return s.vaddr + (fo - s.rawptr); return null; }
function isRipDisp(buf, q) { return q >= 1 && (buf[q - 1] & 0xC7) === 0x05; }
function findRipRefs(rva) {
  const hits = [];
  for (const s of secs) {
    if (s.name !== '.text') continue;
    for (let q = s.rawptr; q < s.rawptr + s.rawsize - 4; q++) {
      if (!isRipDisp(src, q)) continue;
      const disp = src.readInt32LE(q);
      const target = (q - s.rawptr + s.vaddr) + 4 + disp;
      if (target === rva) hits.push('0x' + q.toString(16));
    }
  }
  return hits;
}
for (const arg of process.argv.slice(2)) {
  const off = parseInt(arg, 16);
  const rva = toRva(off);
  const nul = src.indexOf(0, off);
  const s = src.slice(off, nul).toString('utf8');
  const refs = rva === null ? [] : findRipRefs(rva);
  console.log(`@0x${off.toString(16)} "${s}"  rva=${rva === null ? 'n/a' : '0x' + rva.toString(16)}  RIP引用数=${refs.length}  ${refs.slice(0, 8).join(',')}`);
}
