// 从字体导出 JSON 中提取每个字体的 CJK 字形度量（w/h/shift），用于与屏幕实测比对
const fs = require('fs');
const file = process.argv[2] || 'out/fonts_probe.json';
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const probeChars = ['按', '任', '意', '键', '继', '续', '舰', '长', '库', '尔', '特', '魏', '斯', '曼', '早', '上', '好'];
for (const f of j.fonts) {
  if (f.null) { console.log(`[${f.index}] NULL`); continue; }
  const map = {};
  for (const g of (f.glyphs || [])) map[g.c] = g;
  const picked = probeChars.map(c => {
    const g = map[c.codePointAt(0)];
    return g ? `${c}:${g.w}x${g.h}@${g.sh}` : `${c}:-`;
  }).join(' ');
  console.log(`[${f.index}] ${f.name} em=${f.emSize} asc=${f.ascender} lh=${f.lineHeight} ao=${f.ascenderOffset} npage=${f.texturePage} nglyph=${(f.glyphs || []).length}`);
  console.log(`      ${picked}`);
}
