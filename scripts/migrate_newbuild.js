// ============================================================================
// migrate_newbuild.js —— 把汉化流水线迁移到新版游戏（v0.9.8.6）
//   * 9 个烘焙块的 STRG 下标整体 +2（2561→2563 … 2579→2581）
//   * 本地化表新增 3 条文案（补译）
//   * 版本号字面量 0.9.8.4 → 0.9.8.6
// 产出：newbuild/prebreak/{blobs.json.bak,literal_map.json.bak}
//
// 用法: node scripts/migrate_newbuild.js
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const NB = root + '/newbuild';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;

// 旧 STRG id -> 新 STRG id
const IDMAP = { 2561: 2563, 2566: 2568, 2568: 2570, 2574: 2576, 2575: 2577, 2576: 2578, 2577: 2579, 2578: 2580, 2579: 2581 };

// 新增文案的译文
const NEW_TR = {
  'd03_tutorial_hint_encode': '编码电文',
  'd03_tutorial_hint_close': '关闭',
  'd03_tutorial_hint_input_echo': '翻面并盖回响印章',
};

const preBlobs = JSON.parse(fs.readFileSync(root + '/backup_prebreak/blobs.json.bak', 'utf8'));
const preMap = JSON.parse(fs.readFileSync(root + '/backup_prebreak/literal_map.json.bak', 'utf8'));

function parse(s) { return JSON.parse(String(s).replace(CTRL, '')); }

// ---- 本地化表：按新版英文表重建中文表（保持行序，补上新文案）
{
  const oldId = '2578', newId = '2580';
  const cnRows = parse(preBlobs[oldId]);
  const cnMap = new Map(cnRows.filter(r => Array.isArray(r)).map(r => [r[0], r[1]]));
  const enRows = parse(fs.readFileSync(NB + '/extracted/blob_' + newId + '.json', 'utf8'));
  const out = [];
  let added = 0;
  for (const r of enRows) {
    if (!Array.isArray(r)) { out.push(r); continue; }
    const k = r[0];
    if (cnMap.has(k)) { out.push([k, cnMap.get(k)]); continue; }
    if (NEW_TR[k]) { out.push([k, NEW_TR[k]]); added++; continue; }
    out.push([k, r[1]]);       // 未翻译的原样保留（会被报告）
    console.log('  !! 未翻译的新条目: ' + k + ' = ' + JSON.stringify(r[1]));
  }
  console.log('本地化表: 新增译文 ' + added + ' 条, 总行数 ' + out.length);
  // 写回 newbuild/prebreak（其它 8 块直接搬过来）
  const outBlobs = {};
  for (const oldId2 of Object.keys(IDMAP)) {
    const newId2 = IDMAP[oldId2];
    if (newId2 === 2580) { outBlobs[newId2] = JSON.stringify(out); continue; }
    outBlobs[newId2] = preBlobs[oldId2];
  }
  fs.mkdirSync(NB + '/prebreak', { recursive: true });
  fs.writeFileSync(NB + '/prebreak/blobs.json.bak', JSON.stringify(outBlobs), 'utf8');
  console.log('新 prebreak blobs:', Object.keys(outBlobs).join(','));
}

// ---- 版本号字面量
{
  const m = Object.assign({}, preMap);
  const oldKey = 'False Echo Demo v. 0.9.8.4';
  const newKey = 'False Echo Demo v. 0.9.8.6';
  if (oldKey in m) { m[newKey] = m[oldKey].replace('0.9.8.4', '0.9.8.6'); delete m[oldKey]; }
  else m[newKey] = '虚妄回响 Demo v. 0.9.8.6';
  fs.writeFileSync(NB + '/prebreak/literal_map.json.bak', JSON.stringify(m, null, 1), 'utf8');
  console.log('版本号字面量已更新:', JSON.stringify(m[newKey]));
}
