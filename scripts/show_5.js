// Show the exact pool text for the 5 unmatched literal_map entries.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));

const probes = [
  'Earlier dates allowed from ',
  'Every message consists of INPUT',
  'For minor infractions you will receive citations',
  'Thank you for playing the False Echo demo',
  'One wrong, then',
];
for (const p of probes) {
  console.log('=== probe:', JSON.stringify(p));
  const hits = items.filter(it => it.s.includes(p));
  for (const it of hits) {
    console.log(`  off=0x${it.off.toString(16)} len=${it.s.length} owner=${it.owner}`);
    console.log(`  JSON: ${JSON.stringify(it.s)}`);
  }
  if (!hits.length) console.log('  (no hit)');
}
