// 统计 CN 块中「字面量 \n」与「真实换行」的分布
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const en2578 = JSON.parse(fs.readFileSync(path.join(D, 'decoded/b2578.txt'), 'utf8').replace(/\0/g, ''));
const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));

const LIT = '\\n';   // backslash + n
const blocks = Object.keys(raw);
for (const b of blocks) {
  let cn;
  try { cn = JSON.parse(raw[b]); } catch (e) { console.log(b, 'parse fail'); continue; }
  if (!Array.isArray(cn)) { console.log(b, 'not array'); continue; }
  let lit = 0, real = 0, both = 0, empty = 0, total = cn.length;
  for (const row of cn) {
    if (!Array.isArray(row) || row.length < 2) { empty++; continue; }
    const v = row[1];
    if (typeof v !== 'string') { empty++; continue; }
    const hasLit = v.indexOf(LIT) >= 0;
    const hasReal = v.indexOf('\n') >= 0;
    if (hasLit) lit++;
    if (hasReal) real++;
    if (hasLit && hasReal) both++;
  }
  console.log(`block ${b}: rows=${total} literalBackslashN=${lit} realNewline=${real} both=${both} odd=${empty}`);
}

// EN 侧基线
let enLit = 0, enReal = 0;
for (const row of en2578) {
  if (!Array.isArray(row) || row.length < 2) continue;
  const v = row[1];
  if (typeof v !== 'string') continue;
  if (v.indexOf(LIT) >= 0) enLit++;
  if (v.indexOf('\n') >= 0) enReal++;
}
console.log(`EN 2578: literalBackslashN=${enLit} realNewline=${enReal}`);

// 抽样
const em = new Map(en2578.map(r => [r[0], r[1]]));
const cn2578 = JSON.parse(raw['2578']);
let shown = 0;
for (const row of cn2578) {
  if (!Array.isArray(row) || row.length < 2 || typeof row[1] !== 'string') continue;
  if (row[1].indexOf(LIT) < 0) continue;
  console.log('  ' + row[0] + '\n    EN ' + JSON.stringify(em.get(row[0])) + '\n    CN ' + JSON.stringify(row[1]));
  if (++shown >= 10) break;
}
