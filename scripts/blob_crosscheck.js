// Inspect decoded baked blobs and cross-check STRG strings against them.
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

function readTsv(p) {
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  return raw.split('\n').filter(l => l.length).map(l => {
    const i = l.indexOf('\t');
    return [l.slice(0, i), l.slice(i + 1)];
  });
}

const strg = new Map();
for (const [k, v] of readTsv(path.join(root, 'extracted', 'strings.tsv')))
  strg.set(+/^\[(\d+)\]$/.exec(k)[1], v);

const blobs = [];
for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const rawFile = fs.readFileSync(p, 'utf8').replace(/[\u0000\s]+$/g, '');
  const obj = JSON.parse(rawFile);
  const txt = typeof obj === 'string' ? obj : JSON.stringify(obj);
  blobs.push({ idx: i, obj, txt });
  const kind = Array.isArray(obj) ? `array(${obj.length})`
    : (obj && typeof obj === 'object' ? `object{${Object.keys(obj).slice(0, 5).join(',')}}` : typeof obj);
  console.log(`blob ${i}: ${kind}  len=${txt.length}  :: ${txt.slice(0, 120).replace(/\r?\n/g, '\\n')}`);
}

// Flatten every string that appears anywhere in the blobs
function collectStrings(x, out) {
  if (typeof x === 'string') out.add(x);
  else if (Array.isArray(x)) x.forEach(v => collectStrings(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach(v => collectStrings(v, out));
  return out;
}
const blobStrings = new Set();
for (const b of blobs) collectStrings(b.obj, blobStrings);
console.log('\nunique strings inside blobs:', blobStrings.size);

// Also: are loc CSV *keys* present in STRG?
const locKeys = readTsv(path.join(root, 'loc', 'Localization - EN.tsv')).map(r => r[0]);
let keysInStrg = 0;
for (const k of locKeys) if (strg.has(k)) keysInStrg++;
console.log(`Localization keys present verbatim in STRG: ${keysInStrg}/${locKeys.length}`);

console.log('\n===== STRG probes =====');
const probes = [3811, 3813, 3815, 3839, 3458, 3461, 3467, 3470, 3472, 3332, 2954, 2965, 2994,
  5524, 5525, 5531, 5533, 5965, 5980, 5986, 5999, 2745, 2224, 2231, 2233, 2234, 2235, 2236,
  3519, 3521, 4478, 4754, 5916, 3501, 3511];
for (const i of probes) {
  const s = (strg.get(i) || '').replace(/\r/g, '');
  const head = s.slice(0, 55);
  const inBlob = [...blobStrings].some(b => b.replace(/\r/g, '').includes(head) || head.includes(b.replace(/\r/g, '').slice(0, 40)));
  console.log(`${i}\tinBlob=${inBlob ? 'Y' : 'N'}  ${JSON.stringify(s.slice(0, 78))}`);
}
