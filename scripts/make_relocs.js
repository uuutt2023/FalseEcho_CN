// ============================================================================
// make_relocs.js —— 复刻 exe_patch.js 的搬迁决策，记录每条搬迁对应的 RIP 引用位置
//   payload/exe_plan.json  { blobs:[...], literals:[...], relocs:{ label:[refOff,...] } }
// 注入脚本按此计划执行，无需在玩家机器上全量扫描 .text。
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const outDir = path.join(root, 'patcher', 'payload');

const exe = fs.readFileSync(process.env.ORIG_EXE || path.join(root, 'backup_original', 'False Echo.exe'));
const b64map = JSON.parse(fs.readFileSync(path.join(outDir, 'blobs_b64.json'), 'utf8'));
const slots = JSON.parse(fs.readFileSync(path.join(outDir, 'exe_blobslots.json'), 'utf8'));
const lits = JSON.parse(fs.readFileSync(path.join(outDir, 'exe_literals.json'), 'utf8'));

// ---------------------------------------------------------------- PE
const peOff = exe.readUInt32LE(0x3C);
const optSize = exe.readUInt16LE(peOff + 20);
const numSections = exe.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const sectionAlignment = exe.readUInt32LE(peOff + 24 + 32);
const fileAlignment = exe.readUInt32LE(peOff + 24 + 60);
const optHdr = peOff + 24;
const imageBase = exe.readBigUInt64LE(peOff + 24 + 24);
const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({ i, hdrOff: o, name: exe.toString('ascii', o, o + 8).replace(/\0+$/, ''),
    vsize: exe.readUInt32LE(o + 8), vaddr: exe.readUInt32LE(o + 12),
    rawsize: exe.readUInt32LE(o + 16), rawptr: exe.readUInt32LE(o + 20) });
}
function toRva(fo) {
  for (const x of secs) if (fo >= x.rawptr && fo < x.rawptr + x.rawsize) return x.vaddr + (fo - x.rawptr);
  return null;
}
const align = (v, a) => Math.ceil(v / a) * a;
function isRipDisp(q) { if (q < 1) return false; return (exe[q - 1] & 0xC7) === 0x05; }
function findRipRefs(rva) {
  const hits = [];
  for (const s of secs) {
    if (s.name !== '.text') continue;
    for (let q = s.rawptr; q < s.rawptr + s.rawsize - 4; q++) {
      if (!isRipDisp(q)) continue;
      const disp = exe.readInt32LE(q);
      const next = toRva(q + 4);
      if (next === null) continue;
      if (next + disp === rva) hits.push(q);
    }
  }
  return hits;
}
function findAbsolutePtrs(rva) {
  const hits = []; const needle = Buffer.alloc(8);
  needle.writeBigUInt64LE(imageBase + BigInt(rva));
  let p = 0;
  while ((p = exe.indexOf(needle, p)) >= 0) { hits.push(p); p += 8; }
  return hits;
}

// ---------------------------------------------------------------- 计划
const relocs = {};
const blobPlan = [], litPlan = [];
let secCursor = 0;
function allocInNewSection(n) { const off = align(secCursor, 8); secCursor = off + n; return off; }

for (const s of slots) {
  const b64 = b64map[String(s.idx)];
  const oldRva = toRva(s.off);
  const fits = (b64.length + 1) <= (s.slotLen + 1);
  if (fits) { blobPlan.push({ idx: s.idx, off: s.off, slotLen: s.slotLen, len: b64.length, action: 'inplace' }); continue; }
  const refs = findRipRefs(oldRva);
  const abs = findAbsolutePtrs(oldRva);
  if (!refs.length || abs.length) { console.log('!! blob', s.idx, 'refs', refs.length, 'abs', abs.length); continue; }
  const secOffIn = allocInNewSection(b64.length + 1);
  blobPlan.push({ idx: s.idx, off: s.off, slotLen: s.slotLen, len: b64.length, action: 'relocate', secOffIn });
  relocs['blob' + s.idx] = refs;
}
for (const l of lits) {
  const oldRva = toRva(l.off);
  const nul = exe.indexOf(0, l.off);
  const len = nul - l.off;
  const newLen = Buffer.byteLength(l.text, 'utf8');
  if (newLen + 1 <= len + 1) { litPlan.push({ off: l.off, len: newLen, origLen: len, action: 'inplace' }); continue; }
  const refs = findRipRefs(oldRva);
  const abs = findAbsolutePtrs(oldRva);
  if (!refs.length || abs.length) { console.log('!! literal @0x' + l.off.toString(16), 'refs', refs.length, 'abs', abs.length); continue; }
  const secOffIn = allocInNewSection(newLen + 1);
  litPlan.push({ off: l.off, len: newLen, origLen: len, action: 'relocate', secOffIn });
  relocs['lit@0x' + l.off.toString(16)] = refs;
}

// 新节布局
const lastSec = secs[secs.length - 1];
const newSec = {
  vaddr: align(lastSec.vaddr + lastSec.vsize, sectionAlignment),
  rawptr: align(exe.length, fileAlignment),
  hdrOff: secOff + numSections * 40,
  vsize: secCursor,
  rawsize: align(secCursor, fileAlignment),
};

const plan = {
  pe: { peOff, numSections, optSize, secOff, sectionAlignment, fileAlignment, optHdr,
        imageBase: imageBase.toString(), newSec },
  blobs: blobPlan, literals: litPlan, relocs,
  originalLen: exe.length,
};
fs.writeFileSync(path.join(outDir, 'exe_plan.json'), JSON.stringify(plan), 'utf8');
console.log('blobs inplace', blobPlan.filter(b => b.action === 'inplace').length,
            'relocate', blobPlan.filter(b => b.action === 'relocate').length);
console.log('literals inplace', litPlan.filter(l => l.action === 'inplace').length,
            'relocate', litPlan.filter(l => l.action === 'relocate').length);
console.log('reloc labels', Object.keys(relocs).length, 'refs', Object.values(relocs).reduce((a, b) => a + b.length, 0));
console.log('new section vaddr=0x' + newSec.vaddr.toString(16), 'rawptr=0x' + newSec.rawptr.toString(16), 'vsize', newSec.vsize);

