// Fuzzier match: find STRG strings that are near-duplicates of CSV values
// (whitespace/line-ending differences) -> also candidates for STRG-side replacement.
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
const squash = s => (s == null ? '' : String(s)).replace(/\r/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

const strgRows = readTsv(path.join(root, 'extracted', 'strings.tsv'))
  .map(([k, v]) => ({ idx: +/^\[(\d+)\]$/.exec(k)[1], s: v }));

const csvBlobs = [2575, 2576, 2577, 2578, 2579];
const vals = [];      // {squashed, key, blob, val}
const keySet = new Set();
for (const b of csvBlobs) {
  const arr = JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${b}.json`), 'utf8').replace(/[\u0000\s]+$/g, ''));
  for (const [k, v] of arr) {
    keySet.add(k);
    if (typeof v === 'string' && v.trim()) vals.push({ sq: squash(v), key: k, blob: b, val: v });
  }
}
const bySq = new Map();
for (const v of vals) if (!bySq.has(v.sq)) bySq.set(v.sq, v);

// index CSV values by their first 40 squashed chars for prefix matching
const byPrefix = new Map();
for (const v of vals) {
  const p = v.sq.slice(0, 40);
  if (!byPrefix.has(p)) byPrefix.set(p, []);
  byPrefix.get(p).push(v);
}

const hasCJK = s => /[\u3400-\u9FFF]/.test(s);
const results = [];
for (const row of strgRows) {
  const s = row.s;
  if (!s || hasCJK(s)) continue;
  const sq = squash(s);
  if (sq.length < 8) continue;
  if (!/\s/.test(s)) continue;                       // must be prose-ish
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 6) continue;

  let hit = bySq.get(sq);
  let how = 'exact';
  if (!hit) {
    const cands = byPrefix.get(sq.slice(0, 40));
    if (cands) {
      for (const c of cands) {
        const a = c.sq, b = sq;
        const short = a.length < b.length ? a : b, long = a.length < b.length ? b : a;
        if (long.startsWith(short) && long.length - short.length < 120) { hit = c; how = 'prefix'; break; }
      }
    }
  }
  if (hit) results.push({ idx: row.idx, key: hit.key, blob: hit.blob, how, s });
}

console.log('STRG near-duplicates of CSV values:', results.length);
const byTable = {};
for (const r of results) byTable[r.blob] = (byTable[r.blob] || 0) + 1;
console.log('by table:', JSON.stringify(byTable));
const byHow = {};
for (const r of results) byHow[r.how] = (byHow[r.how] || 0) + 1;
console.log('by match:', JSON.stringify(byHow));
fs.writeFileSync(path.join(root, 'extracted', 'strg_near_dupe.json'),
  JSON.stringify(results, null, 1), 'utf8');
console.log('\n--- all matched (idx, csv key) ---');
for (const r of results) console.log(r.idx + '\t' + r.blob + '\t' + r.key + '\t' + r.how + '\t' + JSON.stringify(squash(r.s).slice(0, 70)));
