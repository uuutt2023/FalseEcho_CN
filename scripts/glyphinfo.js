// 打印指定字体的原始字形记录（c/x/y/w/h/shift/off），用于推断 advance 约定
const fs = require('fs');
const file = process.argv[2];
const want = process.argv[3]; // 字体名子串
const chars = (process.argv[4] || '按A').split('');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const f of j.fonts) {
  if (f.null) continue;
  if (want && !f.name.includes(want)) continue;
  console.log(`[${f.index}] ${f.name} em=${f.emSize} asc=${f.ascender} lh=${f.lineHeight} ao=${f.ascenderOffset}`);
  const map = {};
  for (const g of (f.glyphs || [])) map[g.c] = g;
  for (const c of chars) {
    const cp = c.codePointAt(0);
    const g = map[cp];
    console.log(`   '${c}' U+${cp.toString(16).toUpperCase().padStart(4, '0')} -> ${g ? JSON.stringify(g) : 'MISSING'}`);
  }
}
