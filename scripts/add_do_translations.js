// ============================================================================
// add_do_translations.js —— 补译每日命令（Daily Orders）里漏掉的英文
//   2026-10-22 实机回归发现：纸面每日命令的规则行仍夹着英文
//     "back side of VERIFICATION MESSAGE." 等 4 条片段（exe 字符串池，
//     owner=scr_do_orders_layout），以及 ECHO STAMP / STANDARD / DEFAULT /
//     RANK STAMP / All other messages / input message 6 条标签。
//   这些串全部不在「表键 / 表值 / 任务数据」里，翻译安全。
// 用法: node scripts/add_do_translations.js
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const ADD = {
  'back side of VERIFICATION MESSAGE.': '核验电文背面。',
  'back side of VERIFICATION MESSAGE SLIP.': '核验电文条背面。',
  'back side of ENCODING MESSAGE OUTPUT.': '编码电文输出条背面。',
  'back side of ENCODING MESSAGE INPUT.': '编码电文输入条背面。',
  'ECHO STAMP': '回响印章',
  'RANK STAMP': '等级印章',
  'STANDARD': '标准',
  'DEFAULT': '默认',
  'All other messages': '其他所有电文',
  'input message': '输入电文',
};

const targets = [
  path.join(root, 'newbuild', 'prebreak', 'literal_map.json.bak'),
  path.join(root, 'trans', 'literal_map.json'),
];
for (const t of targets) {
  if (!fs.existsSync(t)) { console.log('skip (not found): ' + t); continue; }
  const map = JSON.parse(fs.readFileSync(t, 'utf8'));
  let n = 0;
  for (const [en, cn] of Object.entries(ADD)) {
    if (map[en] !== undefined) { console.log('  已存在，跳过: ' + JSON.stringify(en)); continue; }
    map[en] = cn; n++;
  }
  fs.writeFileSync(t, JSON.stringify(map, null, 1), 'utf8');
  console.log(t + ' : 新增 ' + n + ' 条，共 ' + Object.keys(map).length + ' 条');
}
