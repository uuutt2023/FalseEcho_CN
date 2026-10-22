// ============================================================================
// newbuild_diff.js —— 新旧版本 9 个汉化块的英文原文差异
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const NB = root + '/newbuild';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;

// 旧 STRG id -> 新 STRG id（新版整体后移 1 位）
const MAP = { 2561: 2563, 2566: 2568, 2568: 2570, 2574: 2576, 2575: 2577, 2576: 2578, 2577: 2579, 2578: 2580, 2579: 2581 };

function parse(p) {
  const t = fs.readFileSync(p, 'utf8');
  return { node: JSON.parse(t.replace(CTRL, '')), raw: t.replace(CTRL, '') };
}
function rowsOf(node) {
  if (Array.isArray(node)) return node.filter(r => Array.isArray(r));
  if (node && typeof node === 'object') {
    // 对象型：取所有字符串叶子
    const out = [];
    (function walk(n, pfx) {
      if (typeof n === 'string') { out.push([pfx, n]); return; }
      if (Array.isArray(n)) { n.forEach((v, i) => walk(v, pfx + '[' + i + ']')); return; }
      if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], pfx + '.' + k);
    })(node, '');
    return out;
  }
  return [];
}

fs.mkdirSync(NB + '/diff', { recursive: true });
const summary = [];
for (const oldId of Object.keys(MAP)) {
  const newId = MAP[oldId];
  const oldF = root + '/extracted/blob_' + oldId + '.json';
  const newF = NB + '/extracted/blob_' + newId + '.json';
  if (!fs.existsSync(newF)) { console.log('!! missing new blob', newId); continue; }
  const o = parse(oldF), n = parse(newF);
  const oRows = rowsOf(o.node), nRows = rowsOf(n.node);
  const oMap = new Map(oRows.map(r => [r[0], r[1]]));
  const nMap = new Map(nRows.map(r => [r[0], r[1]]));
  const added = [], changed = [], removed = [];
  for (const [k, v] of nMap) {
    if (!oMap.has(k)) added.push([k, v]);
    else if (oMap.get(k) !== v) changed.push([k, oMap.get(k), v]);
  }
  for (const [k, v] of oMap) if (!nMap.has(k)) removed.push([k, v]);
  console.log('blob ' + oldId + ' -> ' + newId + ':  新增 ' + added.length + ', 变更 ' + changed.length + ', 删除 ' + removed.length);
  summary.push({ oldId: +oldId, newId: +newId, added, changed, removed });
  fs.writeFileSync(NB + '/diff/blob_' + newId + '.json', JSON.stringify({ oldId: +oldId, newId: +newId, added, changed, removed }, null, 1), 'utf8');
}
fs.writeFileSync(NB + '/diff/summary.json', JSON.stringify(summary, null, 1), 'utf8');
