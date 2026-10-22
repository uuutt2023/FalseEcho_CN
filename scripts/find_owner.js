// Find a pool string and report its owner script + neighbouring strings in the
// same script block, so we can read the surrounding logic.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const exePath = path.join(root, 'backup_original', 'False Echo.exe');
const { items } = loadPool(exePath);
const needle = process.argv[2];
const wantOwner = process.argv[3] || null;

for (const it of items) {
  if (it.s !== needle) continue;
  console.log(`\n=== ${JSON.stringify(needle)} @ 0x${it.off.toString(16)} owner=${it.owner}`);
  if (wantOwner) {
    // print the contiguous run of pool strings that share this owner
    const i = items.indexOf(it);
    let start = i, end = i;
    while (start > 0 && items[start - 1].owner === it.owner) start--;
    while (end < items.length - 1 && items[end + 1].owner === it.owner) end++;
    console.log(`  block ${start}..${end} (${end - start + 1} strings)`);
    for (let k = start; k <= end; k++) {
      const p = items[k];
      const mark = k === i ? '>>' : '  ';
      console.log(`${mark} 0x${p.off.toString(16)} ${JSON.stringify(p.s.length > 160 ? p.s.slice(0, 160) + '...' : p.s)}`);
    }
  }
}
