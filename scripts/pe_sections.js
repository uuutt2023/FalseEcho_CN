// PE section map + hunt for a string-offset table pointing into the string pool.
const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);

const peOff = buf.readUInt32LE(0x3C);
const numSections = buf.readUInt16LE(peOff + 6);
const optSize = buf.readUInt16LE(peOff + 20);
const secOff = peOff + 24 + optSize;
console.log('PE at 0x' + peOff.toString(16) + '  sections=' + numSections);
const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  const name = buf.toString('ascii', o, o + 8).replace(/\0+$/, '');
  const vsize = buf.readUInt32LE(o + 8);
  const vaddr = buf.readUInt32LE(o + 12);
  const rawsize = buf.readUInt32LE(o + 16);
  const rawptr = buf.readUInt32LE(o + 20);
  secs.push({ name, vsize, vaddr, rawsize, rawptr });
  console.log(`  ${name.padEnd(10)} vaddr=0x${vaddr.toString(16).padStart(8)} vsize=${vsize} rawptr=0x${rawptr.toString(16)} rawsize=${rawsize}`);
}
fs.writeFileSync(process.argv[3] || 'sections.json', JSON.stringify(secs, null, 1));

// Image base
const imageBase = buf.readUInt32LE(peOff + 24 + 28);
console.log('ImageBase 0x' + imageBase.toString(16));
