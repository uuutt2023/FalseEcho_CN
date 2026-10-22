// Who owns the settings-page labels, and what else is in the same script?
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));

const targets = ['TUTORIAL', 'FPS LIMIT', '60 FPS', 'UNLIMITED', 'PLAYER', 'RESET',
  'False Echo Demo v. 0.9.8.4'];
for (const t of targets) {
  const hits = items.filter(i => i.s === t);
  console.log(`\n=== ${JSON.stringify(t)}  hits=${hits.length}`);
  for (const h of hits) console.log(`   0x${h.off.toString(16)} ${h.owner}`);
  // list the sibling strings of the first owner
  const owner = hits[0] && hits[0].owner;
  if (owner) {
    const sib = items.filter(i => i.owner === owner && i.s !== t);
    console.log(`   -- siblings of ${owner} (${sib.length}):`);
    sib.slice(0, 60).forEach(s => console.log(`      ${JSON.stringify(s.s)}`));
  }
}
