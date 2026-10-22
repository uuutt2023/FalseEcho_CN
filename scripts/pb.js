// pb.js <blobId> <key1> [key2...]  — 打印块内指定键的前/当前值
const fs = require('fs');
function parseFile(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function parseBlock(s) {
  const t = s.replace(/\0+$/, '');
  try { return JSON.parse(t); } catch (e) { return JSON.parse(t.slice(0, t.lastIndexOf(']') + 1)); }
}
const bid = process.argv[2];
const pre = parseBlock(parseFile('backup_prebreak/blobs.json.bak')[bid]);
const cur = parseBlock(parseFile('apply/blobs.json')[bid]);
const mp = new Map(pre.map(p => [p[0], p[1]]));
for (const k of process.argv.slice(3)) {
  const a = mp.get(k);
  const b = (cur.find(p => p[0] === k) || [])[1];
  console.log('--- ' + k);
  console.log('  pre: ' + JSON.stringify(a).slice(0, 220));
  console.log('  cur: ' + JSON.stringify(b).slice(0, 220));
}
