// Find mission JSON blobs in the exe pool (they contain "expected" fields,
// "senderId", "ver_date", ... keys) and list every distinct "expected" value.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const hits = items.filter(it => it.s.includes('"expected"') || it.s.includes('expected'));
console.log(`pool strings containing "expected": ${hits.length}`);
for (const it of hits) {
  console.log(`  0x${it.off.toString(16)} len=${it.s.length} owner=${it.owner}`);
  console.log('   ' + JSON.stringify(it.s).slice(0, 300));
}
const out = path.join(root, 'extracted', 'pool_expected.txt');
fs.writeFileSync(out, hits.map(it => `0x${it.off.toString(16)}\t${it.owner}\t${it.s}`).join('\n'), 'utf8');

// also: pool strings that look like JSON objects (start with { or [)
const jsonish = items.filter(it => /^\s*[[{]/.test(it.s) && it.s.length > 40);
console.log(`\nJSON-looking pool strings: ${jsonish.length}`);
const out2 = path.join(root, 'extracted', 'pool_json.txt');
fs.writeFileSync(out2, jsonish.map(it => `0x${it.off.toString(16)}\t${it.owner}\t${it.s}`).join('\n'), 'utf8');
for (const it of jsonish.slice(0, 25)) {
  console.log(`  0x${it.off.toString(16)} len=${it.s.length} ${it.owner}: ${JSON.stringify(it.s.slice(0, 160))}`);
}
