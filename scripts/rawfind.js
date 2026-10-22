// Raw byte-level search inside a data.win for marker strings.
const fs = require('fs');
const file = process.argv[2];
const markers = process.argv.slice(3);
const buf = fs.readFileSync(file);
console.log(`file: ${file}  size=${buf.length}`);
for (const m of markers) {
  const mb = Buffer.from(m, 'utf8');
  const hits = [];
  let p = 0;
  while (true) {
    p = buf.indexOf(mb, p);
    if (p < 0) break;
    hits.push(p);
    p += 1;
    if (hits.length > 20) break;
  }
  console.log(`  ${JSON.stringify(m.slice(0, 50))} -> ${hits.length} hit(s) @ ${hits.slice(0, 10).map(h => '0x' + h.toString(16)).join(', ')}`);
}
