// Locate exactly which blob(s) contain a given phrase.
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const blobs = {};
for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  blobs[i] = fs.readFileSync(p, 'utf8').replace(/[\u0000\s]+$/g, '');
}
const strgRaw = fs.readFileSync(path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of strgRaw.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  strg.set(+/^\[(\d+)\]$/.exec(line.slice(0, i))[1], line.slice(i + 1));
}

const probes = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [3458, 3461, 3467, 3470, 3472, 3473, 3474, 3332, 2954, 2965, 2967, 2971, 2978, 2987, 2989, 2992, 2994, 2998, 3002, 3014,
     5520, 5521, 5524, 5525, 5526, 5531, 5532, 5533, 5965, 5968, 5980, 5985, 5986, 5999, 2745,
     2224, 2231, 2233, 2234, 2235, 2236, 3519, 3521, 4478, 5916, 3501, 3511, 3513, 3514, 3515, 5247, 5248, 5251, 5252, 5255, 5256,
     5317, 5318, 5321, 5438, 6484, 3811, 3813, 3815, 3839, 2560, 2745, 2889];

for (const i of probes) {
  const s = (strg.get(i) || '').replace(/\r/g, '').trim();
  if (!s) { console.log(`${i}\t<empty>`); continue; }
  const head = s.slice(0, 45);
  const where = [];
  for (const [b, txt] of Object.entries(blobs)) {
    if (txt.includes(head) || txt.includes(s.slice(0, 120).replace(/\n/g, '\\n'))) where.push('blob' + b);
  }
  console.log(`${i}\t${where.length ? where.join(',') : 'STRG-ONLY'}\t${JSON.stringify(s.slice(0, 70))}`);
}
