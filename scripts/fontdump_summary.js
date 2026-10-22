const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const f of j.fonts) {
  if (!f || f.null) { console.log('NULL'); continue; }
  const nm = String(f.name).replace(/"/g, '');
  if (!nm || nm.startsWith('__')) continue;
  const gl = f.glyphs || [];
  const g = gl.find(x => x.c === 0x6309); // 按
  const q = gl.find(x => x.c === 0x56FD); // 国
  const A = gl.find(x => x.c === 0x41);   // A
  const fmt = x => x ? ('w' + x.w + ',h' + x.h + ',sh' + x.shift + ',off' + x.off + ',@' + x.x + ',' + x.y) : 'NONE';
  console.log(nm.padEnd(22), 'em=' + f.emSize, 'asc=' + f.ascender, 'lh=' + f.lineHeight, 'n=' + gl.length,
    '| 按=' + fmt(g), '| 国=' + fmt(q), '| A=' + fmt(A));
}
