// 免缩放判别：比较「英文串墨迹跨度 / 中文串墨迹跨度」与各候选字体的
// 拉丁 advance 之和 / (CJK 字符数 * em) 是否吻合
const fs = require('fs');

const j = JSON.parse(fs.readFileSync('out/fonts_full_orig.json', 'utf8'));
const EN = 'PRESS ANY KEY TO START';
const CNCHARS = 6;           // 「按任意键开始」
const enSpan = 218;          // e01_launch.png 实测：542..759
const cnSpan = 144;          // d01_launch.png(cn4) 实测：579..722

// cn4 版各字体的 CJK em：直接读导出的字体表
const CN_EM = {};
{
  const cj = JSON.parse(fs.readFileSync('out/fonts_cn4.json', 'utf8'));
  for (const f of cj.fonts) {
    if (f.null) continue;
    const g = (f.glyphs || []).find(x => x.c === 0x6309);
    if (g) CN_EM[f.name.replace(/^"|"$/g, '')] = g.w;
  }
}

console.log(`measured ratio en/cn = ${(enSpan / cnSpan).toFixed(4)}  (en=${enSpan} cn=${cnSpan})\n`);
console.log('font                  enAdvSum  cnEm  predictedRatio  | 误差');
const rows = [];
for (const f of j.fonts) {
  if (f.null || f.name.startsWith('__')) continue;
  const map = {};
  for (const g of (f.glyphs || [])) map[g.c] = g;
  let sum = 0, ok = true;
  for (const ch of EN) {
    const g = map[ch.codePointAt(0)];
    if (!g) { ok = false; break; }
    sum += g.shift;
  }
  if (!ok) { console.log(`${f.name.padEnd(20)} 缺少英文字符`); continue; }
  const em = CN_EM[f.name.replace(/^"|"$/g, '')];
  const pred = sum / (CNCHARS * em);
  const err = Math.abs(pred - enSpan / cnSpan) / (enSpan / cnSpan);
  rows.push({ name: f.name, sum, em, pred, err });
  console.log(`${f.name.padEnd(20)} ${String(sum).padStart(8)} ${String(em).padStart(5)} ${pred.toFixed(4).padStart(12)}  | ${(err * 100).toFixed(1)}%`);
}
console.log('\n排序（误差最小在前）:');
rows.sort((a, b) => a.err - b.err).slice(0, 5).forEach(r => console.log(`  ${r.name.padEnd(22)} ${(r.err * 100).toFixed(1)}%  predicted=${r.pred.toFixed(4)}`));
