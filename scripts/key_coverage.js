// key_coverage.js —— 校验：数据块中引用的所有本地化键，是否都存在于已汉化的表里
// 已汉化的表：2575 (Endless EN.csv) / 2576 (规则速查) / 2577 (前线新闻) / 2578 (Localization) / 2579 (WarDiary)
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const BLOB_IDS = [2560, 2561, 2562, 2563, 2564, 2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572, 2573, 2574];
const TABLE_IDS = [2575, 2576, 2577, 2578, 2579];

function readBlob(id) {
  const p = path.join(root, 'extracted', `blob_${id}.json`);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8').replace(/[\u0000]+$/, '').trimEnd();
  try { return JSON.parse(raw); }
  catch (e) {
    // JSONL：逐行解析；行本身可能是 [key, value] 或 [key,v1,v2,v3]
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const rows = [];
    for (const l of lines) {
      try { rows.push(JSON.parse(l)); } catch (e2) { /* skip */ }
    }
    return rows;
  }
}

// ---- 收集表键 ----
const tableKeys = new Set();
const tableKeySource = new Map();
for (const id of TABLE_IDS) {
  const t = readBlob(id);
  if (!t) { console.log(`!! 表 ${id} 缺失`); continue; }
  if (Array.isArray(t)) {
    for (const row of t) {
      if (!Array.isArray(row) || !row.length) continue;
      const k = String(row[0]);
      tableKeys.add(k);
      if (!tableKeySource.has(k)) tableKeySource.set(k, id);
    }
  } else if (t && typeof t === 'object') {
    for (const k of Object.keys(t)) { tableKeys.add(k); if (!tableKeySource.has(k)) tableKeySource.set(k, id); }
  }
}
console.log(`表键总数: ${tableKeys.size}`);

// ---- 收集数据块里引用到的键 ----
const KEY_RE = /^(day_|d0\d_|endless_|txt_|msg_)/;
const refs = new Map(); // key -> Set(blockId)

function walk(node, blockId, path) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    if (KEY_RE.test(node) && node.length < 120) {
      if (!refs.has(node)) refs.set(node, new Set());
      refs.get(node).add(blockId);
    }
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, blockId, path + '/' + i)); return; }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) walk(node[k], blockId, path + '/' + k);
  }
}
for (const id of BLOB_IDS) {
  const t = readBlob(id);
  if (!t) { console.log(`!! 块 ${id} 缺失`); continue; }
  walk(t, id, '');
}

console.log(`数据块引用键总数: ${refs.size}`);

const missing = [];
for (const [k, blocks] of refs) {
  if (!tableKeys.has(k)) missing.push([k, [...blocks]]);
}
console.log(`\n=== 未在汉化表中找到的引用键: ${missing.length} ===`);
const byBlock = new Map();
for (const [k, blocks] of missing) {
  const b = blocks.join(',');
  if (!byBlock.has(b)) byBlock.set(b, []);
  byBlock.get(b).push(k);
}
for (const [b, ks] of [...byBlock].sort((a, b2) => b2[1].length - a[1].length)) {
  console.log(`\n-- 来自块 ${b}: ${ks.length} 个`);
  console.log('   ' + ks.slice(0, 40).join('\n   '));
  if (ks.length > 40) console.log(`   ... 其余 ${ks.length - 40} 个`);
}

// ---- 报告：哪些表键从未被任何数据块引用（可能是 UI 直接引用的散串） ----
const usedKeys = new Set(refs.keys());
const orphanTableKeys = [...tableKeys].filter(k => !usedKeys.has(k));
console.log(`\n=== 表中未被数据块引用的键: ${orphanTableKeys.length} (共 ${tableKeys.size}) ===`);
console.log(orphanTableKeys.slice(0, 60).join('\n'));
if (orphanTableKeys.length > 60) console.log(`... 其余 ${orphanTableKeys.length - 60} 个`);

fs.writeFileSync(path.join(root, 'trans', 'missing_key_refs.json'),
  JSON.stringify(missing.map(([k, b]) => ({ key: k, blocks: b })), null, 2), 'utf8');
