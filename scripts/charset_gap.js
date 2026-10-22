// charset_gap.js —— 用最终中文数据反查字符集缺口（字集是从旧版文本生成的，可能不全）
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;

const charset = new Set(Array.from(fs.readFileSync(root + '/trans/charset.txt', 'utf8')));
const used = new Map();   // char -> 来源
function add(str, src) {
  for (const c of Array.from(String(str))) {
    if (!CJK.test(c)) continue;
    if (!used.has(c)) used.set(c, src);
  }
}
// 1. exe 字面量译文
const map = JSON.parse(fs.readFileSync(root + '/trans/literal_map.json', 'utf8'));
for (const [k, v] of Object.entries(map)) add(v, 'literal:' + k.slice(0, 30));
// 2. 9 个烘焙块的全部字符串
const blobs = JSON.parse(fs.readFileSync(root + '/apply/blobs.json', 'utf8'));
for (const [id, raw] of Object.entries(blobs)) {
  const node = JSON.parse(String(raw).replace(CTRL, ''));
  (function walk(n, p) {
    if (typeof n === 'string') { add(n, 'blob' + id + p); return; }
    if (Array.isArray(n)) { n.forEach((v, i) => walk(v, p + '[' + i + ']')); return; }
    if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], p + '.' + k);
  })(node, '');
}
const missing = [...used.keys()].filter(c => !charset.has(c));
console.log('最终中文数据用到的 CJK 字符: ' + used.size);
console.log('字符集(trans/charset.txt) 大小: ' + charset.size);
console.log('*** 缺字 ' + missing.length + ' 个: ' + missing.join(''));
for (const c of missing) console.log('   ' + c + '  U+' + c.codePointAt(0).toString(16).toUpperCase() + '   来源: ' + used.get(c));
// 多余（字集里有但没用到）
const extra = [...charset].filter(c => !used.has(c));
console.log('字集中未被使用的字符: ' + extra.length);
