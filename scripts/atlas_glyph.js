const fs = require('fs');
const p = JSON.parse(fs.readFileSync('fontout_cn6/fontplan.json', 'utf8'));
const fontName = process.argv[2];
const chars = process.argv.slice(3);
const f = p.fonts.find(x => x.name === fontName);
if (!f) { console.log('font not found: ' + p.fonts.map(x => x.name).join(',')); process.exit(1); }
console.log('font', f.name, 'em', f.em, 'cellH', f.cellH, 'page', f.page);
const cjk = f.cjk || f.glyphs || [];
for (const ch of chars) {
  const cp = ch.codePointAt(0);
  const g = cjk.find(x => x.c === cp);
  if (!g) { console.log(ch + ' U+' + cp.toString(16) + ' NOT FOUND'); continue; }
  console.log(ch + ' U+' + cp.toString(16) + ' atlas x=' + g.x + ' y=' + g.y + ' w=' + g.w + ' h=' + g.h + ' shift=' + g.shift + ' off=' + g.off);
}
