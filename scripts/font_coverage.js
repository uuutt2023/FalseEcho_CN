// font_coverage.js —— 核对每个字体的 CJK 图集覆盖：找出「用了但该字体没有」的字
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;

const plan = JSON.parse(fs.readFileSync(root + '/fontout_cn6/fontplan.json', 'utf8'));
const fonts = new Map();
for (const f of plan.fonts) {
  const set = new Set();
  for (const g of f.cjk) set.add(String.fromCodePoint(g.c));
  fonts.set(f.name, set);
}
console.log('字体图集 CJK 覆盖:');
for (const [name, set] of fonts) console.log('  ' + name.padEnd(24) + set.size + ' 字');

// 需要检查的文本来源：每日命令（fnt_DO_text）用的 txt_do_* 条目 + 池内片段
const cnRaw = JSON.parse(fs.readFileSync(root + '/apply/blobs.json', 'utf8'));
const loc = JSON.parse(String(cnRaw['2580']).replace(CTRL, ''));
const map = JSON.parse(fs.readFileSync(root + '/trans/literal_map.json', 'utf8'));

function charsOf(s) { return new Set(Array.from(String(s)).filter(c => /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/.test(c))); }

const groups = {
  'txt_do_* (fnt_DO_text)': loc.filter(r => Array.isArray(r) && String(r[0]).startsWith('txt_do')).flatMap(r => [String(r[1])]),
  'txt_roster_* (名册)': loc.filter(r => Array.isArray(r) && String(r[0]).startsWith('txt_roster')).flatMap(r => [String(r[1])]),
  'txt_mm_* (主菜单)': loc.filter(r => Array.isArray(r) && String(r[0]).startsWith('txt_mm')).flatMap(r => [String(r[1])]),
  'txt_tut_* (教程)': loc.filter(r => Array.isArray(r) && String(r[0]).startsWith('txt_tut')).flatMap(r => [String(r[1])]),
  'day_01_* (剧情)': loc.filter(r => Array.isArray(r) && String(r[0]).startsWith('day_01')).flatMap(r => [String(r[1])]),
};
const fontOf = {
  'txt_do_* (fnt_DO_text)': 'fnt_DO_text',
  'txt_roster_* (名册)': 'fnt_DO_text',
  'txt_mm_* (主菜单)': 'fnt_DO_text',
  'txt_tut_* (教程)': 'fnt_DO_text',
  'day_01_* (剧情)': 'fnt_DO_text',
};
for (const [g, texts] of Object.entries(groups)) {
  const used = new Set();
  for (const t of texts) for (const c of charsOf(t)) used.add(c);
  const atlas = fonts.get(fontOf[g]) || new Set();
  const missing = [...used].filter(c => !atlas.has(c));
  console.log('\n' + g + '  用到 ' + used.size + ' 个 CJK，' + fontOf[g] + ' 图集缺 ' + missing.length + ' 个');
  if (missing.length) console.log('   缺字: ' + missing.join(''));
}

// 全部字体 vs 全部中文文本（整体覆盖）
const allText = [];
for (const [k, v] of Object.entries(map)) allText.push(String(v));
for (const r of loc) if (Array.isArray(r)) allText.push(String(r[1]));
for (const [id, raw] of Object.entries(cnRaw)) {
  const n = JSON.parse(String(raw).replace(CTRL, ''));
  (function walk(x) {
    if (typeof x === 'string') allText.push(x);
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  })(n);
}
const allUsed = new Set();
for (const t of allText) for (const c of charsOf(t)) allUsed.add(c);
console.log('\n全部汉化文本用到的 CJK 字符数: ' + allUsed.size);
for (const [name, set] of fonts) {
  const missing = [...allUsed].filter(c => !set.has(c));
  console.log('  ' + name.padEnd(24) + '缺 ' + missing.length + (missing.length ? '  ' + missing.join('') : ''));
}
