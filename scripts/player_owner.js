// Owners of the remaining 游戏-tab labels: PLAYER, TUTORIAL (2nd copy),
// FPS LIMIT, 60 FPS, UNLIMITED -- with their sibling strings.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));

for (const t of ['PLAYER', 'TUTORIAL', 'FPS LIMIT', '60 FPS', 'UNLIMITED']) {
  const hits = items.filter(i => i.s === t);
  console.log(`\n=== ${JSON.stringify(t)} hits=${hits.length}`);
  for (const h of hits) {
    console.log(`   @0x${h.off.toString(16)} owner=${h.owner}`);
    const sib = items.filter(i => i.owner === h.owner);
    const idx = sib.indexOf(h);
    for (let k = Math.max(0, idx - 12); k < Math.min(sib.length, idx + 13); k++) {
      console.log(`      ${k === idx ? '>>' : '  '} ${JSON.stringify(sib[k].s)}`);
    }
  }
}
