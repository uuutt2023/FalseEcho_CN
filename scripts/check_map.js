// Analyze:
//  1) the real key sets of the 5 baked tables (column 0) + Endless expected targets
//  2) which literal_map.json entries fail to match the exe pool exactly
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

function loadBlob(i) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  let raw = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const arr = JSON.parse(raw);
  return arr;
}

// ---- column shape per table
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const arr = loadBlob(i);
  const counts = {};
  for (const r of arr) counts[r.length] = (counts[r.length] || 0) + 1;
  console.log(`blob ${i}: rows=${arr.length} colcount=${JSON.stringify(counts)}`);
}

// ---- key sets
const tableKeys = new Set();      // column 0 of every table
const tableValues = new Set();    // all other columns
const expectedTargets = new Set();// Endless player-input comparison targets
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const arr = loadBlob(i);
  for (const row of arr) {
    if (!Array.isArray(row)) continue;
    if (typeof row[0] === 'string') tableKeys.add(row[0].replace(/\r/g, '').trim());
    for (let c = 1; c < row.length; c++) {
      if (typeof row[c] === 'string') tableValues.add(row[c].replace(/\r/g, '').trim());
    }
  }
}
// Endless: a "player input" target looks like a bare code/word sequence
{
  const arr = loadBlob(2575);
  for (const row of arr) {
    if (Array.isArray(row) && row.length >= 3 && typeof row[2] === 'string' && row[2].trim()) {
      expectedTargets.add(row[2].trim());
    }
  }
}
console.log(`\ntableKeys=${tableKeys.size} tableValues=${tableValues.size} expectedTargets=${expectedTargets.size}`);
fs.writeFileSync(path.join(root, 'trans', 'table_keys.txt'), [...tableKeys].sort().join('\n'), 'utf8');
fs.writeFileSync(path.join(root, 'trans', 'table_values.txt'), [...tableValues].sort().join('\n'), 'utf8');
fs.writeFileSync(path.join(root, 'trans', 'expected_targets.txt'), [...expectedTargets].sort().join('\n'), 'utf8');

// ---- literal_map vs pool
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const byText = new Map();
for (const it of items) {
  if (!byText.has(it.s)) byText.set(it.s, []);
  byText.get(it.s).push(it);
}
console.log(`\nmap entries=${Object.keys(map).length}  pool items=${items.length}`);

let miss = 0, hitVal = 0, hitKey = 0, hitExp = 0;
for (const [en, cn] of Object.entries(map)) {
  const t = en.trim();
  const hits = byText.get(en);
  if (!hits) {
    // try trimmed / whitespace variants
    const alt = [...byText.keys()].filter(k => k.trim() === t);
    if (alt.length) {
      console.log(`MISS-but-variant  ${JSON.stringify(en.slice(0, 90))}`);
      for (const a of alt) console.log(`     variant: ${JSON.stringify(a.slice(0, 110))}  hits=${byText.get(a).length}`);
    } else {
      console.log(`MISS  ${JSON.stringify(en.slice(0, 90))}`);
    }
    miss++;
    continue;
  }
  if (tableKeys.has(t)) { hitKey++; }
  else if (expectedTargets.has(t)) { hitExp++; }
  else if (tableValues.has(t)) hitVal++;
}
console.log(`\nsummary: miss=${miss}  inTableKeys=${hitKey}  inExpected=${hitExp}  inTableValuesOnly=${hitVal}`);
