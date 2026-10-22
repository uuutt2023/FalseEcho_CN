// apply_fixes.js —— 统一落盘本轮订正
//   1) literal_map：订正残留英文 / 优化措辞
//   2) blobs.json (block 2578)：订正 cadre / cadets / charges 等残留英文
//   3) 记录「弹窗按钮」白名单，供 build_literals 放行
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const mapPath = path.join(root, 'trans', 'literal_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// ---- 1) literal_map 订正 ----
// 键 = 英文原文，值 = 中文译文。此处按「值内残留英文」模式订正。
const VALUE_FIX = [
  // fellow STASEC officer —— 残留英文
  ['国家安全委officer！', '国家安全委官员！'],
  // 60 FPS 标签：更自然
  ['60 帧', '60 帧/秒'],
];
let fixed = 0;
for (const [from, to] of VALUE_FIX) {
  for (const k of Object.keys(map)) {
    if (typeof map[k] === 'string' && map[k].includes(from)) {
      map[k] = map[k].split(from).join(to);
      fixed++;
      console.log(`  订正: ${JSON.stringify(k.slice(0, 40))} -> ${JSON.stringify(map[k].slice(-24))}`);
    }
  }
}
fs.writeFileSync(mapPath, JSON.stringify(map, null, 1), 'utf8');
console.log(`literal_map 订正 ${fixed} 条，共 ${Object.keys(map).length} 条`);

// ---- 2) blobs.json 2578 订正 ----
const blobsPath = path.join(root, 'apply', 'blobs.json');
const blobs = JSON.parse(fs.readFileSync(blobsPath, 'utf8'));
function rowsOf(id) {
  const raw = blobs[String(id)];
  try { return JSON.parse(raw.replace(/[\u0000]+$/, '').trimEnd()); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
function dumpRows(id, rows) {
  // 保持原始格式：整块是 JSON 数组（单行）
  blobs[String(id)] = JSON.stringify(rows);
}
const r2578 = rowsOf(2578);
const BLOB_FIX = [
  ['终于有幸见到国家安全委 cadre 中的奥普雷西亚新星。', '终于有幸见到国家安全委干部中的奥普雷西亚新星。'],
  ['他很早就考入海军 cadets，并以班级第一名毕业于海军学校。', '他很早就考入海军候补军官班，并以班级第一名毕业于海军学校。'],
  ['一次逮捕在他加入党的青年组织后被封存。', ''],   // 占位，不应命中
];
let bfixed = 0;
for (const row of r2578) {
  if (!Array.isArray(row)) continue;
  for (let c = 1; c < row.length; c++) {
    if (typeof row[c] !== 'string') continue;
    for (const [from, to] of BLOB_FIX) {
      if (to === '') continue;
      if (row[c].includes(from)) { row[c] = row[c].split(from).join(to); bfixed++; }
    }
    // charges 被撤销 -> 指控被撤销
    if (row[c].includes('charges 被撤销')) { row[c] = row[c].split('charges 被撤销').join('指控被撤销'); bfixed++; }
  }
}
dumpRows(2578, r2578);
fs.writeFileSync(blobsPath, JSON.stringify(blobs, null, 1), 'utf8');
console.log(`block 2578 订正 ${bfixed} 处`);

// ---- 3) 弹窗按钮白名单 ----
// 结束提示弹窗的 CANCEL / ACCEPT 按钮文案来自 PPFX UI 库与主菜单控制器，
// 默认被「开发库不翻译」规则排除，这里按偏移精确放行。
const BUTTON_WHITELIST = [
  { off: 0x2eff744, en: 'ACCEPT', cn: '确定' },
  { off: 0x2eff7cc, en: 'CANCEL', cn: '取消' },
  { off: 0x2fd15bc, en: 'CANCEL', cn: '取消' },
  { off: 0x300d2b8, en: 'CANCEL', cn: '取消' },
];
fs.writeFileSync(path.join(root, 'trans', 'button_whitelist.json'), JSON.stringify(BUTTON_WHITELIST, null, 1), 'utf8');
console.log(`按钮白名单: ${BUTTON_WHITELIST.length} 项`);
