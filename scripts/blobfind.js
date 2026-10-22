// 在 apply/blobs.json 中递归搜索字符串，输出 JSON 路径与截断后的值
// 用法: node scripts/blobfind.js <regex> [maxHits]
const fs = require('fs');
const re = new RegExp(process.argv[2]);
let max = +(process.argv[3] || 20);
const b = JSON.parse(fs.readFileSync('apply/blobs.json', 'utf8'));
function walk(node, path, idx) {
  if (max <= 0) return;
  if (typeof node === 'string') {
    if (re.test(node)) {
      console.log(`blob ${idx} | ${path} => ${JSON.stringify(node.length > 100 ? node.slice(0, 100) + '...' : node)}`);
      max--;
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, idx));
    return;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (re.test(k)) {
        const v = node[k];
        console.log(`blob ${idx} | KEY ${path}.${k} => ${JSON.stringify(typeof v === 'string' ? (v.length > 100 ? v.slice(0, 100) + '...' : v) : v)}`);
        if (--max <= 0) return;
      }
      walk(node[k], `${path}.${k}`, idx);
    }
  }
}
for (const [idx, raw] of Object.entries(b)) {
  const clean = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '');
  let arr;
  try { arr = JSON.parse(clean); } catch (e) { console.log(`blob ${idx}: parse fail`); continue; }
  walk(arr, '', idx);
}
