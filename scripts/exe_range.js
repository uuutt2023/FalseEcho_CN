// Dump printable strings within a byte range of the exe.
const fs = require('fs');
const file = process.argv[2];
const start = parseInt(process.argv[3], 16);
const end = parseInt(process.argv[4], 16);
const buf = fs.readFileSync(file);
const s = buf.toString('latin1').slice(start, end);
const re = /[\x20-\x7E]{3,300}/g;
let m;
let off = start;
while ((m = re.exec(s)) !== null) {
  console.log(`0x${(off + m.index).toString(16)}  ${JSON.stringify(m[0])}`);
}
