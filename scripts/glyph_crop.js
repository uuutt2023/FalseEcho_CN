// glyph_crop.js <fontName> <char> — 导出字体图集里某个字符的字形格子 PNG
const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('fontout_cn6/fontplan.json', 'utf8'));
const name = process.argv[2];
const ch = process.argv[3];
const f = plan.fonts.find(x => x.name === name);
if (!f) { console.error('font not found'); process.exit(1); }
const cp = ch.codePointAt(0);
let g = (f.cjk || []).find(x => x.c === cp);
if (!g) g = (f.latin || []).find(x => x.c === cp);
if (!g) { console.error('char not found in font', name, ch); process.exit(1); }
console.log('glyph', JSON.stringify(g), 'font em=' + f.em, 'baseline=' + f.baseline, 'cellH=' + f.cellH, 'page=' + f.page);
const { execFileSync } = require('child_process');
const png = plan.pages[f.page];
const out = 'out/glyph_' + name + '_' + cp.toString(16) + '.png';
execFileSync('node', ['scripts/crop.js', png, out, String(g.x), String(g.y), String(g.w), String(g.h), '12']);
console.log('->', out);
