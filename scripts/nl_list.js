// 列出所有含字面量 \n 的 CN 条目，并对比 EN 的分隔符结构
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const LIT = '\\n';

function parseJsonText(s) {
  return JSON.parse(s.replace(/\0+$/, ''));
}

const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));
const enRawText = fs.readFileSync(path.join(D, 'decoded/b2578.txt'), 'utf8').replace(/\0/g, '');

const cn = parseJsonText(raw['2578']);
const en = parseJsonText(enRawText);
const em = new Map(en.map(r => [r[0], r[1]]));

let n = 0, match = 0, mismatch = 0;
for (const row of cn) {
  if (!Array.isArray(row) || row.length < 2 || typeof row[1] !== 'string') continue;
  const v = row[1];
  if (v.indexOf(LIT) < 0) continue;
  const e = em.get(row[0]);
  const eSegs = typeof e === 'string' ? e.split(/\r\n|\r|\n/) : null;
  const cSegs = v.split(/\\n|\r\n|\r|\n/);
  const ok = eSegs && eSegs.length === cSegs.length;
  n++;
  if (ok) match++; else mismatch++;
  console.log(`[${ok ? 'OK ' : 'MIS'}] ${row[0]}  enSegs=${eSegs ? eSegs.length : '?'} cnSegs=${cSegs.length}`);
  if (!ok) {
    console.log('    EN ' + JSON.stringify(e));
    console.log('    CN ' + JSON.stringify(v));
  }
}
console.log(`\ntotal=${n} segMatch=${match} segMismatch=${mismatch}`);
