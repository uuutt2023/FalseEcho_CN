const fs = require('fs');
const f = JSON.parse(fs.readFileSync('fonts_cn.json', 'utf8'));
const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
for (const font of f.fonts) {
  const name = font.name.replace(/"/g, '');
  const cjk = font.glyphs.filter(g => CJK.test(String.fromCodePoint(g.c)));
  if (!cjk.length) { console.log(name + '  : no CJK'); continue; }
  let bad = 0, maxW = 0, minShift = 99, maxShift = 0, maxH = 0, sample = null;
  for (const g of cjk) {
    if (g.w > g.shift) { bad++; if (!sample) sample = String.fromCodePoint(g.c) + ' w=' + g.w + ' shift=' + g.shift; }
    if (g.w > maxW) maxW = g.w;
    if (g.shift < minShift) minShift = g.shift;
    if (g.shift > maxShift) maxShift = g.shift;
    if (g.h > maxH) maxH = g.h;
  }
  console.log(name.padEnd(24) + ' em=' + String(font.emSize).padEnd(4) + ' LH=' + String(font.lineHeight).padEnd(4) +
    ' cjk=' + String(cjk.length).padEnd(5) + ' wMax=' + String(maxW).padEnd(3) + ' shift=' + minShift + '..' + maxShift +
    ' hMax=' + maxH + '  w>shift: ' + bad + (sample ? '  e.g. ' + sample : ''));
}
