// 合并译文 → 校验 → 生成字符集
const fs = require('fs');
const path = require('path');

const transDir = 'E:/FalseEcho_CN/trans';
const endDir = path.join(transDir, 'Endless');

function readTsv(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.length).map(l => {
    const i = l.indexOf('\t');
    return i < 0 ? { key: l, val: '' } : { key: l.slice(0, i), val: l.slice(i + 1) };
  });
}

// ---- 主表 ----
const mainFiles = fs.readdirSync(transDir).filter(f => /^Localization\.cn\.\d+\.tsv$/.test(f)).sort();
const main = new Map();
for (const f of mainFiles) for (const r of readTsv(path.join(transDir, f))) main.set(r.key, r.val);

// ---- Endless ----
const endFiles = fs.readdirSync(endDir).filter(f => /^out_\d+\.tsv$/.test(f)).sort();
const endless = new Map();
const endKeys = new Map();
for (const f of endFiles) {
  const rows = readTsv(path.join(endDir, f));
  endKeys.set(f, rows.length);
  for (const r of rows) {
    if (endless.has(r.key)) console.log('DUP endless key: ' + r.key);
    endless.set(r.key, r.val);
  }
}
console.log('Endless 批次:', [...endKeys.entries()].map(([k, v]) => k + '=' + v).join(' '));
console.log('主表译文条目: ' + main.size + '   Endless 译文条目: ' + endless.size);

// ---- 校验：Endless 覆盖度 ----
const inFiles = fs.readdirSync(endDir).filter(f => /^in_\d+\.tsv$/.test(f)).sort();
let missing = 0, extra = 0;
for (const f of inFiles) {
  const inRows = readTsv(path.join(endDir, f));
  const outFile = path.join(endDir, f.replace('in_', 'out_'));
  const outRows = readTsv(outFile);
  if (inRows.length !== outRows.length) console.log(`!! ${f}: 输入 ${inRows.length} 行, 输出 ${outRows.length} 行`);
  for (let i = 0; i < inRows.length; i++) {
    if (!outRows[i] || outRows[i].key !== inRows[i].key) { console.log(`!! ${f} 第 ${i + 1} 行 key 不匹配: ${inRows[i].key} vs ${outRows[i] && outRows[i].key}`); extra++; }
    else if (outRows[i].val === '' && inRows[i].val !== '') { missing++; }
  }
}
console.log(`校验: key 不匹配 ${extra} 处, 译文为空 ${missing} 处`);

// ---- 合并输出 ----
const merged = [];
for (const [k, v] of main) merged.push(k + '\t' + v);
for (const [k, v] of endless) merged.push(k + '\t' + v);
fs.writeFileSync(path.join(transDir, 'merged_all.tsv'), merged.join('\n'), 'utf8');
console.log('merged_all.tsv: ' + merged.length + ' 条');

// ---- 字符集 ----
const chars = new Set();
for (const [k, v] of main) for (const c of v) if (c.codePointAt(0) > 127) chars.add(c);
for (const [k, v] of endless) for (const c of v) if (c.codePointAt(0) > 127) chars.add(c);
const wd = readTsv(path.join(transDir, 'WarDiary.cn.tsv'));
for (const r of wd) for (const c of r.val) if (c.codePointAt(0) > 127) chars.add(c);
const arr = [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
fs.writeFileSync(path.join(transDir, 'charset.txt'), arr.join('\n'), 'utf8');
console.log('唯一非 ASCII 字符数: ' + arr.length);

// 分类统计
const cjk = arr.filter(c => c.codePointAt(0) >= 0x4E00 && c.codePointAt(0) <= 0x9FFF).length;
const punct = arr.filter(c => c.codePointAt(0) < 0x4E00).length;
console.log(`  其中汉字 ${cjk} 个, 标点/其它 ${punct} 个`);
console.log('  标点: ' + arr.filter(c => c.codePointAt(0) < 0x4E00).join(''));

