// Dump STRG neighbourhoods so we can see which strings belong to one script/UI.
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';
const raw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of raw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}
const csv = new Map(JSON.parse(fs.readFileSync(path.join(root, 'extracted', 'blob_2578.json'), 'utf8').replace(/[\u0000\s]+$/g, '')));
const csvVals = new Map();
for (const [k, v] of csv) csvVals.set(String(v).trim().toUpperCase(), k);

const ranges = process.argv.slice(2).map(s => s.split('-').map(Number));
for (const [a, b] of ranges) {
  console.log(`\n########## STRG ${a}..${b} ##########`);
  for (let i = a; i <= b; i++) {
    const s = (strg.get(i) || '').replace(/\r/g, '');
    const key = csvVals.get(s.trim().toUpperCase());
    console.log(`${i}\t${key ? '[CSV:' + key + '] ' : ''}${JSON.stringify(s).slice(0, 150)}`);
  }
}
