// ============================================================================
// break_invariant2.js —— cn10 断行不变量校验（允许插入空白：换行或空格）
// 断言：新文本必须能由「断行前文本」仅通过插入空白字符得到
//       （逐字符双指针匹配：非空白字符必须完全一致且顺序不变）
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const PRE_DIR = process.env.BREAK_PREBREAK || path.join(root, 'backup_prebreak');
const specPath = path.join(PRE_DIR, 'exe_spec.json.bak');
const before = {
  map: JSON.parse(fs.readFileSync(path.join(PRE_DIR, 'literal_map.json.bak'), 'utf8')),
  blobs: JSON.parse(fs.readFileSync(path.join(PRE_DIR, 'blobs.json.bak'), 'utf8')),
  spec: fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : null,
};
const after = {
  map: JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8')),
  blobs: JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8')),
  spec: JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8')),
};
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const isWS = c => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\u3000';

// 只允许插入空白：逐字符比对
function onlyWhitespaceInserted(pre, post) {
  if (typeof pre !== 'string' || typeof post !== 'string') return pre === post;
  let i = 0, j = 0;
  while (j < post.length) {
    if (i < pre.length && post[j] === pre[i]) { i++; j++; continue; }
    if (isWS(post[j])) { j++; continue; }
    return false;
  }
  return i === pre.length;
}

let bad = 0, checked = 0, insTotal = 0;
function cmp(tag, a, b) {
  checked++;
  if (onlyWhitespaceInserted(a, b)) {
    insTotal += b.length - a.length;
    return;
  }
  bad++;
  if (bad <= 12) {
    console.log('!! ' + tag + ' 不是「仅插入空白」');
    console.log('   A=' + JSON.stringify(String(a).slice(0, 140)));
    console.log('   B=' + JSON.stringify(String(b).slice(0, 140)));
  }
}

for (const k of Object.keys(after.map)) {
  if (!(k in before.map)) { console.log('!! 新增键: ' + k.slice(0, 60)); bad++; continue; }
  cmp('literal_map[' + k.slice(0, 40) + ']', before.map[k], after.map[k]);
}
for (const k of Object.keys(before.map)) if (!(k in after.map)) { console.log('!! 丢失键: ' + k.slice(0, 60)); bad++; }

const beforeLits = before.spec ? new Map(before.spec.literals.map(l => [l.off, l.text])) : null;
if (beforeLits) for (const l of after.spec.literals) {
  if (!beforeLits.has(l.off)) { console.log('!! spec 新增 off 0x' + l.off.toString(16)); bad++; continue; }
  cmp('spec@0x' + l.off.toString(16), beforeLits.get(l.off), l.text);
}
if (before.spec && before.spec.literals.length !== after.spec.literals.length) {
  console.log('!! spec literals 数量变化 ' + before.spec.literals.length + ' -> ' + after.spec.literals.length);
  bad++;
}

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
    for (const k of kb) { if (!(k in a)) { out.push([p + '.' + k, '(存在)', '(缺失)']); continue; } walkDiff(b[k], a[k], p + '.' + k, out); }
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
console.log('比较条目 ' + checked + '，不一致 ' + bad + '，插入空白字符总数 ' + insTotal);
console.log(bad === 0 ? 'INVARIANT OK —— 只插入了空白（空格/换行），未增删任何文字' : 'INVARIANT VIOLATED');
process.exit(bad === 0 ? 0 : 1);


