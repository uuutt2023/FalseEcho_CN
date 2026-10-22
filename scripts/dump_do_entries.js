// dump_do_entries.js —— 列出本地化表里 txt_do_* / txt_verm_* 等每日命令相关条目
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
const file = process.argv[2] || (root + '/newbuild/extracted/blob_2580.json');
const filter = process.argv[3] || 'txt_do';
const en = JSON.parse(fs.readFileSync(root + '/extracted/blob_2578.json', 'utf8').replace(CTRL, ''));
const enMap = new Map(en.map(r => [r[0], r[1]]));
const cn = JSON.parse(fs.readFileSync(file, 'utf8').replace(CTRL, ''));
let same = 0, diff = 0;
for (const r of cn) {
  if (!Array.isArray(r)) continue;
  const [k, v] = r;
  if (!k.startsWith(filter)) continue;
  const e = enMap.get(k);
  const isCn = CJK.test(String(v));
  if (String(v) === String(e)) same++; else diff++;
  console.log((isCn ? '[CN] ' : '[EN] ') + k + ' = ' + JSON.stringify(String(v).length > 130 ? String(v).slice(0, 130) + '...' : v));
}
console.log('--- 同英文(未译) ' + same + ' / 已译 ' + diff);
