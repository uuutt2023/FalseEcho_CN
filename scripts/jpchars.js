const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const f = j.fonts.find(x => x && String(x.name).indexOf('japanese') >= 0);
if (!f) { console.log('not found; names=', j.fonts.map(x => x && x.name).join('|')); process.exit(1); }
console.log('name', JSON.stringify(f.name), 'count', f.glyphs.length);
console.log('chars:', f.glyphs.map(g => String.fromCodePoint(g.c)).join(''));
const lat = f.glyphs.filter(g => g.c >= 0x20 && g.c < 0x7f);
console.log('latin count', lat.length, '->', lat.map(g => String.fromCodePoint(g.c)).join(''));
console.log('sample glyphs', JSON.stringify(f.glyphs.slice(0, 8)));
