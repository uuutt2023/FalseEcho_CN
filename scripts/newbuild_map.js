// ============================================================================
// newbuild_map.js —— 分析新版游戏：定位 9 个烘焙块、导出英文原文、与旧版比对
// ============================================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const NB = root + '/newbuild';

// ---- 1. 新版 STRG
const raw = fs.readFileSync(NB + '/strings.tsv', 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  const mm = /^\[(\d+)\]$/.exec(line.slice(0, i));
  if (mm) strg.set(+mm[1], line.slice(i + 1).replace(/\\r/g, '\r').replace(/\\n/g, '\n'));
}
console.log('STRG entries:', strg.size);

// ---- 2. 新版 exe 的烘焙块
const exe = fs.readFileSync(root + '/backup_newbuild/False Echo.exe');
const B64 = /[A-Za-z0-9+/]{200,}={0,2}/g;
let m;
const blocks = [];
while ((m = B64.exec(exe.toString('latin1'))) !== null) {
  let dec = null;
  try { dec = zlib.inflateSync(Buffer.from(m[0], 'base64')).toString('utf8'); } catch (e) { continue; }
  blocks.push({ off: m.index, b64: m[0], dec });
}
// 去重
const uniq = [];
const seen = new Set();
for (const b of blocks) { if (!seen.has(b.b64)) { seen.add(b.b64); uniq.push(b); } }
console.log('exe baked blocks:', uniq.length);

// ---- 3. 用旧英文原文给每个块定 ID（按内容匹配）
const oldIds = ['2561', '2566', '2568', '2574', '2575', '2576', '2577', '2578', '2579'];
const oldMap = new Map();
for (const id of oldIds) {
  const p = root + '/extracted/blob_' + id + '.json';
  const t = fs.readFileSync(p, 'utf8');
  const n = JSON.parse(t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, ''));
  oldMap.set(id, { node: n, text: t });
}
function shape(s) { return s.replace(/\s+/g, ' ').slice(0, 400); }

const newBlobs = {};
for (const b of uniq) {
  // 先按解码内容匹配（新版 data.win 的块）
  let id = null;
  for (const [k, v] of strg) {
    let dv = null;
    try { dv = zlib.inflateSync(Buffer.from(v, 'base64')).toString('utf8'); } catch (e) { }
    if (dv !== null && dv === b.dec) { id = String(k); break; }
  }
  if (id === null) {
    // 再按旧版内容形状匹配
    for (const oid of oldIds) {
      const oldText = oldMap.get(oid).text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '');
      if (shape(oldText) === shape(b.dec)) { id = oid + '(shape)'; break; }
    }
  }
  if (id !== null && !id.includes('shape')) {
    newBlobs[id] = { off: b.off, b64: b.b64, dec: b.dec };
  }
  console.log('  block @0x' + b.off.toString(16) + ' declen=' + b.dec.length + ' -> STRG id ' + id);
}
fs.mkdirSync(NB + '/extracted', { recursive: true });
for (const id of Object.keys(newBlobs)) {
  fs.writeFileSync(NB + '/extracted/blob_' + id + '.json', newBlobs[id].dec, 'utf8');
}
console.log('mapped blobs:', Object.keys(newBlobs).join(','));

// ---- 4. 与旧版英文原文比对：逐行找差异
fs.mkdirSync(NB + '/diff', { recursive: true });
for (const id of Object.keys(newBlobs)) {
  const oldT = oldMap.get(id).text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '');
  const newT = newBlobs[id].dec.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '');
  if (oldT === newT) { console.log('blob ' + id + ': 与旧版英文完全一致'); continue; }
  // 解析成行来比对
  let oldN, newN;
  try { oldN = JSON.parse(oldT); newN = JSON.parse(newT); } catch (e) { console.log('blob ' + id + ': 解析失败'); continue; }
  const oldRows = new Map();
  if (Array.isArray(oldN)) for (const r of oldN) if (Array.isArray(r)) oldRows.set(r[0], r);
  const added = [], changed = [], removed = [];
  const newKeys = new Set();
  if (Array.isArray(newN)) for (const r of newN) {
    if (!Array.isArray(r)) continue;
    const k = r[0]; newKeys.add(k);
    if (!oldRows.has(k)) added.push(r);
    else if (oldRows.get(k)[1] !== r[1]) changed.push({ k, old: oldRows.get(k)[1], neu: r[1] });
  }
  for (const k of oldRows.keys()) if (!newKeys.has(k)) removed.push([k, oldRows.get(k)[1]]);
  console.log('blob ' + id + ': 新增 ' + added.length + ' 条, 变更 ' + changed.length + ' 条, 删除 ' + removed.length + ' 条');
  fs.writeFileSync(NB + '/diff/blob_' + id + '.json', JSON.stringify({ added, changed, removed }, null, 1), 'utf8');
}
