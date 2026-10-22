// Dump every string value in the mission/step/dialogue blobs 2560..2574 so
// the translation list can be finalised.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const out = [];
for (let i = 2560; i <= 2574; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const v = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim());
  const seen = new Set();
  (function walk(node, pathStr) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      if (seen.has(pathStr)) return;
      seen.add(pathStr);
      if (!/[A-Za-z]/.test(node)) return;
      out.push(`${i}\t${pathStr}\t${JSON.stringify(node)}`);
      return;
    }
    if (Array.isArray(node)) { node.forEach((x, j) => walk(x, `${pathStr}[${j}]`)); return; }
    if (typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], `${pathStr}.${k}`);
  })(v, '');
}
const p = path.join(root, 'extracted', 'mission_strings.tsv');
fs.writeFileSync(p, out.join('\n'), 'utf8');
console.log(`-> ${p} (${out.length} values)`);
// only the sentence-like ones
const interesting = out.filter(l => {
  const v = JSON.parse(l.split('\t').slice(2).join('\t'));
  return /[ ,.!?:]/.test(v) && /[A-Za-z]{3}/.test(v);
});
console.log(`\nsentence-like: ${interesting.length}`);
interesting.forEach(l => console.log('  ' + l));
