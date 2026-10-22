// Extract all printable ASCII strings from the exe that mention localization / csv / locale.
const fs = require('fs');
const file = process.argv[2];
const pat = new RegExp(process.argv[3] || 'localization|csv|locale|i18n', 'i');
const buf = fs.readFileSync(file);
const s = buf.toString('latin1');
const re = /[\x20-\x7E]{4,200}/g;
let m;
const hits = [];
while ((m = re.exec(s)) !== null) {
  if (pat.test(m[0])) hits.push({ off: m.index, len: m[0].length, text: m[0] });
}
console.log('matches:', hits.length);
const seen = new Set();
for (const h of hits) {
  if (seen.has(h.text)) continue;
  seen.add(h.text);
  console.log(`0x${h.off.toString(16)}  ${JSON.stringify(h.text)}`);
}
