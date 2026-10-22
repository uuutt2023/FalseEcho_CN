// diff_exe.js —— 原始 exe 与补丁后 exe 的逐字节差分，按连续区间聚类
const fs = require('fs');
const A = fs.readFileSync('E:/FalseEcho_CN/backup_original/False Echo.exe');
const B = fs.readFileSync('E:/FalseEcho_CN/out/FalseEcho_cn.exe');
console.log(`原 ${A.length} 字节 / 新 ${B.length} 字节 / 差 ${B.length - A.length}`);

const common = Math.min(A.length, B.length);
const regions = [];
let start = -1;
for (let i = 0; i < common; i++) {
  if (A[i] !== B[i]) { if (start < 0) start = i; }
  else { if (start >= 0) { regions.push([start, i]); start = -1; } }
}
if (start >= 0) regions.push([start, common]);
// 尾部新增
if (B.length > common) regions.push([common, B.length]);

console.log(`差异区间数: ${regions.length}`);
let inNewSection = 0;
const table = [];
for (const [s, e] of regions) {
  const len = e - s;
  const isNew = s >= 0x3980000;
  if (isNew) { inNewSection++; continue; }
  const orig = A.slice(s, Math.min(e, s + 64)).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
  const neu = B.slice(s, Math.min(e, s + 64)).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
  table.push({ s, e, len, orig, neu });
}
console.log(`位于新增节(.cndata)内的区间: ${inNewSection}（跳过）`);
console.log(`原位改动区间数: ${table.length}`);
for (const r of table) {
  console.log(`\n@0x${r.s.toString(16)} (${r.s}) len=${r.len}`);
  console.log(`   原: ${r.orig}`);
  console.log(`   新: ${r.neu}`);
}
