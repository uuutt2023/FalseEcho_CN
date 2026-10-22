// ============================================================================
// break_review.js —— 断行落盘后的校验与抽查
//   1) apply/exe_spec.json 的 blobs 必须与 apply/blobs.json 逐字节一致
//   2) literal_map.json 与 exe_spec.json 的同源译文应产生同样的断行结果
//   3) 打印若干断行样本（before -> after）供人工抽查
// 用法: node scripts/break_review.js [sampleCount]
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const N = +(process.argv[2] || 20);

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

// ---- 1) blob 一致性
let bad = 0;
const kb = Object.keys(after.blobs), ks = Object.keys(after.spec.blobs);
for (const k of kb) {
  if (!(k in after.spec.blobs)) { console.log(`!! blob ${k}: 缺于 exe_spec`); bad++; continue; }
  if (after.spec.blobs[k] !== after.blobs[k]) { console.log(`!! blob ${k}: exe_spec 与 blobs.json 不一致`); bad++; }
}
for (const k of ks) if (!(k in after.blobs)) { console.log(`!! blob ${k}: 仅存在于 exe_spec`); bad++; }
console.log(`blob 一致性: ${bad === 0 ? 'OK (' + kb.length + ' 块)' : bad + ' 处不一致'}`);

// ---- 2) literal_map 与 exe_spec 同源一致性
const mapChanged = Object.keys(after.map).filter(k => after.map[k] !== before.map[k]);
const specChanged = (after.spec.literals || []).filter(l => {
  const b = before.spec.literals.find(x => x.off === l.off);
  return b && b.text !== l.text;
});
console.log(`literal_map 改动 ${mapChanged.length} 条 / exe_spec.literals 改动 ${specChanged.length} 条`);

// exe_spec literal 文本是否都能在 literal_map 里找到（同一 EN 的不同池位置应共享译文）
const specTexts = new Set(specChanged.map(l => l.text));
const mapTexts = new Set(mapChanged.map(k => after.map[k]));
let orphan = 0;
for (const t of specTexts) if (!mapTexts.has(t)) orphan++;
console.log(`spec 独有(不在 map 改动集合)的译文条目: ${orphan}`);

// ---- 3) 样本
function dump(tag, beforeS, afterS) {
  console.log(`\n===== ${tag} =====`);
  console.log('BEFORE: ' + JSON.stringify(beforeS));
  console.log('AFTER : ' + JSON.stringify(afterS));
}
let shown = 0;
for (const k of mapChanged) {
  if (shown >= N) break;
  dump(`literal_map[${k}]`, before.map[k], after.map[k]);
  shown++;
}
// blob 内的样本
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
function walkDiff(b, a, pathStr, out, depth) {
  if (depth > 6 || out.length > 200) return;
  if (typeof b === 'string' && typeof a === 'string') {
    if (b !== a) out.push({ path: pathStr, b, a });
    return;
  }
  if (Array.isArray(b) && Array.isArray(a)) {
    for (let i = 0; i < Math.min(b.length, a.length); i++) walkDiff(b[i], a[i], `${pathStr}[${i}]`, out, depth + 1);
    return;
  }
  if (b && a && typeof b === 'object' && typeof a === 'object') {
    for (const k of Object.keys(b)) if (k in a) walkDiff(b[k], a[k], `${pathStr}.${k}`, out, depth + 1);
  }
}
for (const k of Object.keys(after.blobs)) {
  if (before.blobs[k] === after.blobs[k]) continue;
  let bn, an;
  try { bn = JSON.parse(before.blobs[k].replace(CTRL, '')); an = JSON.parse(after.blobs[k].replace(CTRL, '')); } catch (e) { continue; }
  const diffs = [];
  walkDiff(bn, an, `blob${k}`, diffs, 0);
  console.log(`\n### blob ${k}: ${diffs.length} 处字符串改动`);
  for (const d of diffs.slice(0, 6)) {
    console.log(`  ${d.path}`);
    console.log('    - ' + JSON.stringify(d.b.length > 110 ? d.b.slice(0, 110) + '...' : d.b));
    console.log('    + ' + JSON.stringify(d.a.length > 110 ? d.a.slice(0, 110) + '...' : d.a));
  }
}
