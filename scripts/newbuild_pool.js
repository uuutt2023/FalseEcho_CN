// ============================================================================
// newbuild_pool.js —— 比对新旧 exe 的字符串池：找新增字面量，并为已有字面量定位新偏移
// ============================================================================
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const oldItems = loadPool(path.join(root, 'backup_original', 'False Echo.exe')).items;
const newItems = loadPool(path.join(root, 'backup_newbuild', 'False Echo.exe')).items;
console.log('pool items: old', oldItems.length, ' new', newItems.length);

const oldSet = new Set(oldItems.map(it => it.s));
const added = [];
for (const it of newItems) {
  if (!oldSet.has(it.s)) added.push(it);
}
console.log('new pool strings:', added.length);
// 去重展示
const seen = new Set();
for (const it of added) {
  if (seen.has(it.s)) continue;
  seen.add(it.s);
  console.log('  + [' + (it.owner || '?') + '] @0x' + (it.off !== undefined ? it.off.toString(16) : '?') + '  ' + JSON.stringify(it.s.length > 120 ? it.s.slice(0, 120) + '...' : it.s));
}

// 已有 437 条在新 exe 里的位置
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const newByStr = new Map();
for (const it of newItems) {
  if (!newByStr.has(it.s)) newByStr.set(it.s, []);
  newByStr.get(it.s).push(it);
}
let miss = 0, multi = 0;
const res = [];
for (const en of Object.keys(map)) {
  const hits = newByStr.get(en);
  if (!hits || !hits.length) { miss++; res.push({ en, found: false }); continue; }
  if (hits.length > 1) multi++;
  res.push({ en, found: true, off: hits[0].off, count: hits.length });
}
console.log('mapped literals: ' + Object.keys(map).length + '  未在新池中找到: ' + miss + '  多处命中: ' + multi);
fs.writeFileSync(path.join(root, 'newbuild', 'literal_offsets.json'), JSON.stringify(res, null, 1), 'utf8');
fs.writeFileSync(path.join(root, 'newbuild', 'pool_added.json'), JSON.stringify(added.map(a => ({ s: a.s, owner: a.owner, off: a.off })), null, 1), 'utf8');
