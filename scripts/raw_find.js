const fs = require('fs');
const A = fs.readFileSync('E:/FalseEcho_CN/backup_original/False Echo.exe');
const needles = process.argv.slice(2);
for (const n of needles) {
  const buf = Buffer.from(n, 'latin1');
  let i = 0, hits = [];
  while ((i = A.indexOf(buf, i)) >= 0) { hits.push(i); i++; }
  console.log(`"${n}" x${hits.length}: ` + hits.map(h => '0x' + h.toString(16)).join(', '));
  for (const h of hits.slice(0, 40)) {
    const s = Math.max(0, h - 40), e = Math.min(A.length, h + 40);
    const ctx = A.slice(s, e).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    console.log(`   @0x${h.toString(16)}  ...${ctx}...`);
  }
}
