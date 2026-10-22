const fs = require('fs');
const buf = fs.readFileSync('E:/FalseEcho_CN/backup_original/data.win');
const names = ['fnt_ContentText', 'fnt_DO_text', 'fnt_textbody'];
let out = '';
for (const nm of names) {
  const needle = Buffer.from(nm, 'utf8');
  const idx = buf.indexOf(needle);
  out += `=== ${nm} @ ${idx} ===\n`;
  const from = Math.max(0, idx - 120);
  const to = Math.min(buf.length, idx + 40);
  for (let i = from; i < to; i += 24) {
    out += (i + ': ' + buf.slice(i, Math.min(i + 24, to)).toString('hex').match(/.{8}/g).join(' ') + '\n');
  }
  out += '\n';
}
fs.writeFileSync('E:/FalseEcho_CN/font_head.hex', out, 'utf8');
console.log(out);
