// Check whether every character used by the CURRENT Chinese text exists in the
// generated font charset (trans/charset.txt).
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const charset = fs.readFileSync(path.join(root, 'trans', 'charset.txt'), 'utf8');
const have = new Set([...charset].filter(c => c.codePointAt(0) > 0x2000));

// collect every CJK char from all Chinese sources
const srcs = [];
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
for (const [id, text] of Object.entries(blobs)) srcs.push([`blob ${id}`, text]);
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
for (const [en, cn] of Object.entries(map)) srcs.push([`literal ${JSON.stringify(en.slice(0, 40))}`, cn]);
const TR = require(path.join(root, 'trans', 'mission_blob_cn.js'));
for (const id of Object.keys(TR)) for (const [en, cn] of Object.entries(TR[id])) srcs.push([`mission ${id} ${en.slice(0, 30)}`, cn]);

const missing = new Map();
for (const [label, text] of srcs) {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x2000) continue;                 // latin / punctuation
    if (have.has(ch)) continue;
    if (!missing.has(ch)) missing.set(ch, new Set());
    missing.get(ch).add(label);
  }
}
console.log(`charset size: ${have.size}`);
console.log(`missing characters: ${missing.size}`);
for (const [ch, labels] of [...missing].sort()) {
  console.log(`  ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}  in ${labels.size} place(s)  e.g. ${[...labels][0]}`);
}
fs.writeFileSync(path.join(root, 'trans', 'missing_chars.txt'),
  [...missing.keys()].sort().join('') + '\n', 'utf8');
