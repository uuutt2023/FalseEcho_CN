// 枚举需要补显式换行的 exe 字面量：
//   条件 = 英文原文无换行 + 中文译文无换行 + 中文≥8字
// （这些文本在游戏内靠空格自动换行，中文无空格 → 整段挤成一行溢出）
const fs = require('fs');

const spec = JSON.parse(fs.readFileSync('apply/exe_spec.json', 'utf8'));
const lits = spec.literals || [];
// spec 中出现过的译文（含重复）
const cnSet = new Set(lits.map(l => l.text));

const map = JSON.parse(fs.readFileSync('trans/literal_map.json', 'utf8'));
const hits = [];
for (const en of Object.keys(map)) {
  const cn = map[en];
  if (typeof cn !== 'string') continue;
  if (!cnSet.has(cn)) continue;                 // 只看真正替换进 exe 的条目
  const enBreak = /(\\r\\n|\\n|\r|\n)/.test(en);
  const cnBreak = /(\\r\\n|\\n|\r|\n)/.test(cn);
  const cjk = (cn.match(/[\u4e00-\u9fff]/g) || []).length;
  if (!enBreak && !cnBreak && cjk >= 8) hits.push({ en, cn, cjk });
}
console.log(`需补显式换行的条目: ${hits.length}\n`);
for (const h of hits) {
  console.log(`EN(${h.en.length}) : ${h.en}`);
  console.log(`CN(${h.cjk}字)  : ${h.cn}`);
  console.log('');
}
