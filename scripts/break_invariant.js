// ============================================================================
// break_invariant.js —— 断行不变量校验
// 断言：断行前后，去掉所有换行符后文本必须逐字节相同
//       （即断行只允许插入 CRLF，不得增删/重排任何字符）
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const before = {
  map: JSON.parse(fs.readFileSync(path.join(root, 'backup_prebreak', 'literal_map.json.bak'), 'utf8')),
  blobs: JSON.parse(fs.readFileSync(path.join(root, 'backup_prebreak', 'blobs.json.bak'), 'utf8')),
  spec: JSON.parse(fs.readFileSync(path.join(root, 'backup_prebreak', 'exe_spec.json.bak'), 'utf8')),
};
const after = {
  map: JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8')),
  blobs: JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8')),
  spec: JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8')),
};
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const stripNL = s => s.replace(/\r\n|\n|\r/g, '');

let bad = 0, checked = 0;
function cmp(tag, a, b) {
  checked++;
  if (stripNL(a) !== stripNL(b)) {
    bad++;
    if (bad <= 10) {
      console.log(`!! ${tag} 去掉换行后不一致`);
      console.log('   A=' + JSON.stringify(stripNL(a).slice(0, 120)));
      console.log('   B=' + JSON.stringify(stripNL(b).slice(0, 120)));
    }
  }
}

// literal_map
for (const k of Object.keys(after.map)) {
  if (!(k in before.map)) { console.log('!! 新增键: ' + k.slice(0, 60)); bad++; continue; }
  cmp('literal_map[' + k.slice(0, 40) + ']', before.map[k], after.map[k]);
}
for (const k of Object.keys(before.map)) if (!(k in after.map)) { console.log('!! 丢失键: ' + k.slice(0, 60)); bad++; }

// exe_spec literals
const beforeLits = new Map(before.spec.literals.map(l => [l.off, l.text]));
for (const l of after.spec.literals) {
  if (!beforeLits.has(l.off)) { console.log('!! spec 新增 off 0x' + l.off.toString(16)); bad++; continue; }
  cmp('spec@0x' + l.off.toString(16), beforeLits.get(l.off), l.text);
}
if (before.spec.literals.length !== after.spec.literals.length) {
  console.log(`!! spec literals 数量变化 ${before.spec.literals.length} -> ${after.spec.literals.length}`);
  bad++;
}

// blobs: 递归比较
function walkDiff(b, a, p, out) {
  if (typeof b === 'string' && typeof a === 'string') { if (b !== a) out.push([p, b, a]); return; }
  if (Array.isArray(b) && Array.isArray(a)) {
    if (b.length !== a.length) { out.push([p + '.length', String(b.length), String(a.length)]); return; }
    for (let i = 0; i < b.length; i++) walkDiff(b[i], a[i], `${p}[${i}]`, out);
    return;
  }
  if (b && a && typeof b === 'object' && typeof a === 'object') {
    const kb = Object.keys(b), ka = Object.keys(a);
    if (kb.length !== ka.length) { out.push([p + '.keys', String(kb.length), String(ka.length)]); return; }
    for (const k of kb) { if (!(k in a)) { out.push([p + '.' + k, '(存在)', '(缺失)']); continue; } walkDiff(b[k], a[k], `${p}.${k}`, out); }
    return;
  }
  out.push([p, JSON.stringify(b), JSON.stringify(a)]);
}
for (const k of Object.keys(after.blobs)) {
  let bn, an;
  try {
    bn = JSON.parse(before.blobs[k].replace(CTRL, ''));
    an = JSON.parse(after.blobs[k].replace(CTRL, ''));
  } catch (e) { console.log('!! blob ' + k + ' 解析失败'); bad++; continue; }
  const diffs = [];
  walkDiff(bn, an, 'blob' + k, diffs);
  for (const [p, b, a] of diffs) { cmp(p, b, a); checked++; }
}
console.log(`\n比较条目 ${checked}，不一致 ${bad}`);
console.log(bad === 0 ? 'INVARIANT OK —— 断行仅插入换行，未改动任何字符' : 'INVARIANT VIOLATED');
process.exit(bad === 0 ? 0 : 1);
