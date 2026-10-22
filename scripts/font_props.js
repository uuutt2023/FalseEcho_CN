// 打印每个原版字体的 em/asc/lh/ao，并从字形表计算拉丁大写墨迹高(capH)与基线
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2] || 'out/fonts_full_orig.json', 'utf8'));
const rows = [];
for (const f of j.fonts) {
  if (f.null) { rows.push({ i: f.index, name: f.name, null: true }); continue; }
  const map = {}; for (const g of (f.glyphs || [])) map[g.c] = g;
  // capH = 墨迹高最大的大写字母
  let capH = 0, capCh = '';
  for (const ch of 'HILMNBEADCGPRST') {
    const g = map[ch.charCodeAt(0)]; if (!g) continue;
    if (g.h > capH) { capH = g.h; capCh = ch; }
  }
  // 基线行 = ascender - ascenderOffset
  const baselineRow = f.ascender - (f.ascenderOffset || 0);
  rows.push({
    i: f.index, name: f.name.replace(/"/g, ''),
    em: f.emSize, asc: f.ascender, lh: f.lineHeight, ao: f.ascenderOffset,
    baselineRow, capH, capCh,
  });
}
rows.sort((a, b) => a.i - b.i);
console.log('idx  name                        em  asc  lh  ao  base  capH  capCh');
for (const r of rows) {
  if (r.null) { console.log(`${String(r.i).padStart(2)}   ${r.name}  <NULL>`); continue; }
  console.log(`${String(r.i).padStart(2)}   ${r.name.padEnd(26)} ${String(r.em).padStart(3)} ${String(r.asc).padStart(4)} ${String(r.lh).padStart(3)} ${String(r.ao).padStart(3)} ${String(r.baselineRow).padStart(5)} ${String(r.capH).padStart(5)}  ${r.capCh}`);
}
