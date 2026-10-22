// 调试：为什么 atom 拆分没生效
const fs = require('fs');
const src = fs.readFileSync('E:/FalseEcho_CN/scripts/break_long.js', 'utf8');
const m = src.match(/const BREAK_AFTER = '(.*)';/);
const n = src.match(/const NO_LINE_START = '(.*)';/);
console.log('BREAK_AFTER raw:', JSON.stringify(m && m[1]));
console.log('BREAK_AFTER cps:', m && Array.from(m[1]).map(c => 'U+' + c.codePointAt(0).toString(16)).join(' '));
console.log('includes U+FF0C (，):', m && m[1].includes('\uFF0C'));
console.log('NO_LINE_START cps:', n && Array.from(n[1]).map(c => 'U+' + c.codePointAt(0).toString(16)).join(' '));

const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
const LAT_RE = /[0-9A-Za-z]/;
const units = s => { let u = 0; for (const c of s) u += CJK_RE.test(c) ? 1 : 0.5; return u; };
const line = '仅当所有生效的验证项均为真时为 TRUE，否则为 FALSE';
console.log('\nline units =', units(line));
const atoms = []; let cur = '';
for (const ch of line) { cur += ch; if (m[1].includes(ch)) { atoms.push(cur); cur = ''; } }
if (cur) atoms.push(cur);
console.log('atoms:', JSON.stringify(atoms));
console.log('atom units:', atoms.map(a => units(a)));
let buf = '';
const out = [];
for (const a of atoms) {
  if (units(buf + a) > 16) { out.push(buf); buf = a; } else buf += a;
}
if (buf) out.push(buf);
console.log('result:', JSON.stringify(out.join('\r\n')));
