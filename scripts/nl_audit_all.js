// 审计所有 CN 块与 exe 字面量池中的「字面量 \n」与真实换行
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const LIT = '\\n';

const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));
for (const b of Object.keys(raw)) {
  const s = raw[b];
  let lit = 0, real = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      if (s[i + 1] === 'n') { lit++; i++; }
    } else if (s[i] === '\n' || s[i] === '\r') { real++; }
  }
  console.log(`block ${b}: len=${s.length} literalBackslashN=${lit} realNewlineChars=${real}`);
}

// exe 池字面量
const lm = JSON.parse(fs.readFileSync(path.join(D, 'trans/literal_map.json'), 'utf8').replace(/\0/g, ''));
let plit = 0, preal = 0, samples = [];
for (const [k, v] of Object.entries(lm)) {
  if (typeof v !== 'string') continue;
  if (v.indexOf(LIT) >= 0) { plit++; if (samples.length < 6) samples.push([k, v]); }
  if (v.indexOf('\n') >= 0) preal++;
}
console.log(`literal_map: entries=${Object.keys(lm).length} literalBackslashN=${plit} realNewline=${preal}`);
for (const s of samples) console.log('   ' + JSON.stringify(s[0]) + ' => ' + JSON.stringify(s[1]));

// EN 原始块里的真实换行统计（作为对照）
for (const b of Object.keys(raw)) {
  const p = path.join(D, 'decoded', 'b' + b + '.txt');
  if (!fs.existsSync(p)) { console.log('no decoded for ' + b); continue; }
  const s = fs.readFileSync(p, 'utf8').replace(/\0/g, '');
  let lit = 0, real = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') { if (s[i + 1] === 'n') { lit++; i++; } }
    else if (s[i] === '\n' || s[i] === '\r') real++;
  }
  console.log(`EN block ${b}: literalBackslashN=${lit} realNewlineChars=${real}`);
}
