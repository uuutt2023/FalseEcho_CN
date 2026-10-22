const fs = require('fs');
const A = fs.readFileSync('E:/FalseEcho_CN/backup_original/False Echo.exe');
const list = JSON.parse(fs.readFileSync('E:/FalseEcho_CN/trans/overrun_literals.json', 'utf8'));
for (const b of list) {
  const nxt = b.nxt;
  const e = A.indexOf(0, nxt);
  const full = A.slice(nxt, e).toString('utf8');
  console.log('@0x' + b.off.toString(16) + '  "' + b.orig + '"  clobbers next string: "' + full + '"');
}
