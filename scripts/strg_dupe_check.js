// How many STRG strings duplicate a CSV value (i.e. could be displayed directly
// from STRG instead of the baked table)? And are any of them used as KEYS?
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
const norm = s => (s == null ? '' : String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim());

const strgRows = readTsv(path.join(root, 'extracted', 'strings.tsv'))
  .map(([k, v]) => ({ idx: +/^\[(\d+)\]$/.exec(k)[1], s: v }));

// CSV tables baked as blobs
const csvBlobs = [2575, 2576, 2577, 2578, 2579];
const valueToKey = new Map();   // normalized EN value -> key
const keySet = new Set();
const tables = [];
for (const b of csvBlobs) {
  const arr = JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${b}.json`), 'utf8').replace(/[\u0000\s]+$/g, ''));
  const m = new Map();
  for (const [k, v] of arr) {
    m.set(k, v);
    keySet.add(k);
    const n = norm(v);
    if (n && !valueToKey.has(n)) valueToKey.set(n, { key: k, blob: b, val: v });
  }
  tables.push({ blob: b, map: m });
}
console.log('CSV tables:', tables.map(t => `${t.blob}(${t.map.size})`).join(' '));
console.log('unique EN values:', valueToKey.size);

// JSON blobs: collect every "key-like" token used as a lookup (loc / text_key / key / etc.)
const jsonKeyLike = new Set();
for (let i = 2560; i <= 2574; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const obj = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000\s]+$/g, ''));
  const walk = x => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      for (const [k, v] of Object.entries(x)) {
        if (['loc', 'text_key', 'key', 'title_key', 'msg_key', 'sender_key', 'ver_sender_key', 'message_key', 'label', 'name'].includes(k) && typeof v === 'string')
          jsonKeyLike.add(v);
        walk(v);
      }
    }
  };
  walk(obj);
}
console.log('lookup-style tokens referenced from JSON blobs:', jsonKeyLike.size);

const dupes = [];
for (const row of strgRows) {
  const n = norm(row.s);
  if (!n) continue;
  const hit = valueToKey.get(n);
  if (!hit) continue;
  const isKey = keySet.has(n) || jsonKeyLike.has(n);
  dupes.push({ ...row, key: hit.key, blob: hit.blob, isKey });
}
const safe = dupes.filter(d => !d.isKey);
console.log(`\nSTRG strings duplicating a CSV value : ${dupes.length}`);
console.log(`  ...of which also used as a KEY    : ${dupes.length - safe.length}`);
console.log(`  ...SAFE to replace with Chinese   : ${safe.length}`);

const byTable = {};
for (const d of safe) byTable[d.blob] = (byTable[d.blob] || 0) + 1;
console.log('safe duplicates by table:', JSON.stringify(byTable));

// how many already have a Chinese translation available?
let have = 0, missing = 0;
const missingRows = [];
for (const d of safe) {
  const t = tables.find(x => x.blob === d.blob).map.get(d.key);
  if (/[\u3400-\u9FFF]/.test(t)) have++; else { missing++; missingRows.push(d); }
}
console.log(`  with Chinese in baked table       : ${have}`);
console.log(`  WITHOUT Chinese (need STRG edit)  : ${missing}`);

fs.writeFileSync(path.join(root, 'extracted', 'strg_dupe_safe.json'),
  JSON.stringify(safe.map(d => ({ idx: d.idx, key: d.key, blob: d.blob, s: d.s })), null, 1), 'utf8');
fs.writeFileSync(path.join(root, 'extracted', 'strg_dupe_missing_cn.json'),
  JSON.stringify(missingRows.map(d => ({ idx: d.idx, key: d.key, blob: d.blob, s: d.s })), null, 1), 'utf8');
console.log('\nwrote extracted/strg_dupe_safe.json and strg_dupe_missing_cn.json');

// show a sample of the ones that are SAFE but whose table value is still English
console.log('\n--- sample safe duplicates still English in table ---');
for (const d of missingRows.slice(0, 25)) console.log(d.idx + '\t' + d.key + '\t' + JSON.stringify(norm(d.s).slice(0, 90)));
