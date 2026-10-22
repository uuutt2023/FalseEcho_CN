const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byName = {};
for (const f of j.fonts) if (f && !f.null) byName[String(f.name).replace(/^"|"$/g, '')] = f;

function adv(f, str) {
  let w = 0;
  for (const ch of str) {
    const g = f.glyphs.find(x => x.c === ch.codePointAt(0));
    if (!g) { w += -1; continue; }
    w += g.shift;
  }
  return w;
}
function inkInfo(f, str) {
  let mx = 0, ws = [];
  for (const ch of str) {
    const g = f.glyphs.find(x => x.c === ch.codePointAt(0));
    if (!g) { ws.push('?'); continue; }
    ws.push(ch + ':w' + g.w + ',h' + g.h + ',sh' + g.shift + ',off' + g.off);
  }
  return ws.join(' ');
}

const s1 = 'STATE SECURITY';
const s2 = 'PERSONAL ID';
for (const name of ['fnt_japanese', 'fnt_ContentText', 'fnt_ContentExtended', 'fnt_TitleText', 'Standard_Pixel_Font', 'fnt_textbody']) {
  const f = byName[name];
  if (!f) { console.log(name, 'MISSING'); continue; }
  console.log('---', name, 'em=' + f.emSize, 'asc=' + f.ascender, 'lh=' + f.lineHeight, 'ao=' + f.ascenderOffset);
  console.log('   adv("' + s1 + '") =', adv(f, s1), ' adv("' + s2 + '") =', adv(f, s2));
  console.log('   ', inkInfo(f, s1));
}
