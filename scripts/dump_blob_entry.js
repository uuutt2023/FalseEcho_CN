// dump_blob_entry.js <blobId> <keyRegex>
// 从 apply/blobs.json 取出块内容并按 key 正则打印（带转义）
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('apply/blobs.json', 'utf8'));
const blobId = process.argv[2];
const re = new RegExp(process.argv[3] || '.');
let raw = b[blobId];
// 去掉尾部 NUL / 空白
let s = raw.replace(/\0+$/, '');
let t;
try { t = JSON.parse(s); } catch (e) {
  // 可能尾部还有多余内容，尝试截断到最后一个 ']'
  const idx = s.lastIndexOf(']');
  t = JSON.parse(s.slice(0, idx + 1));
}
let n = 0;
for (const pair of t) {
  const k = Array.isArray(pair) ? pair[0] : pair;
  const v = Array.isArray(pair) ? pair[1] : '';
  if (re.test(k)) {
    console.log(k + ' => ' + JSON.stringify(v));
    n++;
  }
}
console.log('--- matched ' + n + ' ---');
