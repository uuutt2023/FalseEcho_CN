// fix_day_desc.js —— 章节标题补「天」
// 英文原版： "Day" + "1" + "- Remembrance"  →  中文应为 "第 1 天 —— 追忆"
// 游戏把「第」「数字」「desc」分开渲染，desc 槽位没有「天」，故补在 desc 开头。
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;

const MAP = {
  'gen_day1_desc': '天 —— 追忆',
  'gen_day2_desc': '天 —— 失踪',
  'gen_day3_desc': '天 —— 猎手',
};

const p = path.join(root, 'apply', 'blobs.json');
const blobs = JSON.parse(fs.readFileSync(p, 'utf8'));
let n = 0;
for (const [idx, raw] of Object.entries(blobs)) {
  const clean = raw.replace(CTRL, '');
  const tail = (raw.match(CTRL) || []).join('');
  const node = JSON.parse(clean);
  let touched = false;
  (function walk(n) {
    if (Array.isArray(n)) {
      for (const row of n) {
        if (Array.isArray(row) && typeof row[0] === 'string' && MAP[row[0]] !== undefined) {
          console.log(`blob ${idx} ${row[0]}: ${JSON.stringify(row[1])} -> ${JSON.stringify(MAP[row[0]])}`);
          row[1] = MAP[row[0]];
          touched = true;
        } else walk(row);
      }
      return;
    }
    if (n && typeof n === 'object') for (const k of Object.keys(n)) {
      if (MAP[k] !== undefined && typeof n[k] === 'string') {
        console.log(`blob ${idx} ${k}: ${JSON.stringify(n[k])} -> ${JSON.stringify(MAP[k])}`);
        n[k] = MAP[k];
        touched = true;
      } else walk(n[k]);
    }
  })(node);
  if (touched) { blobs[idx] = JSON.stringify(node) + tail; n++; }
}
fs.writeFileSync(p, JSON.stringify(blobs, null, 1), 'utf8');
console.log(`更新 ${n} 块`);
