// Find long zero runs inside file-backed sections (free space we can use).
const fs = require('fs');
const file = process.argv[2];
const minRun = parseInt(process.argv[3] || '2048', 16);
const buf = fs.readFileSync(file);
const peOff = buf.readUInt32LE(0x3C);
const optSize = buf.readUInt16LE(peOff + 20);
const numSections = buf.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({ name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''), vsize: buf.readUInt32LE(o + 8), vaddr: buf.readUInt32LE(o + 12), rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20) });
}
const found = [];
for (const s of secs) {
  let run = 0, start = 0;
  for (let i = s.rawptr; i < s.rawptr + s.rawsize; i++) {
    if (buf[i] === 0) {
      if (run === 0) start = i;
      run++;
      if (run === minRun) found.push({ sec: s.name, start, len: run });
      else if (run > minRun && found.length && found[found.length - 1].sec === s.name && found[found.length - 1].start + found[found.length - 1].len === start + 1) {
        found[found.length - 1].len = run;
      }
    } else run = 0;
  }
}
found.sort((a, b) => b.len - a.len);
console.log('zero runs >= ' + minRun + ':');
for (const f of found.slice(0, 25)) console.log(`  ${f.sec.padEnd(9)} 0x${f.start.toString(16)}  len=${f.len}`);
