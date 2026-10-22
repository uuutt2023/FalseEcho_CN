// list_untranslated.js —— 列出最终中文数据里仍然残留英文的可翻译条目
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;

const en = JSON.parse(fs.readFileSync(root + '/extracted/blob_2578.json', 'utf8').replace(CTRL, ''));
const enMap = new Map(en.map(r => [r[0], r[1]]));
const cn = JSON.parse(String(JSON.parse(fs.readFileSync(root + '/apply/blobs.json', 'utf8'))['2580']).replace(CTRL, ''));
console.log('=== 本地化表中与英文原文相同（未译）的条目 ===');
let n = 0;
for (const r of cn) {
  if (!Array.isArray(r)) continue;
  const [k, v] = r;
  const e = enMap.get(k);
  if (e === undefined || String(v) !== String(e)) continue;
  n++;
  console.log('  ' + k + ' = ' + JSON.stringify(String(v).length > 100 ? String(v).slice(0, 100) + '...' : v));
}
console.log('共 ' + n + ' 条');
