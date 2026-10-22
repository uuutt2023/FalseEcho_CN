// Inspect the structure of the 5 baked localization tables in data.win.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) { console.log(i, 'MISSING'); continue; }
  let raw = fs.readFileSync(p, 'utf8');
  raw = raw.replace(/[\u0000]+/g, '');
  raw = raw.trim();
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    // maybe multiple JSON docs concatenated
    const parts = [];
    let depth = 0, start = -1, inStr = false, esc = false;
    for (let k = 0; k < raw.length; k++) {
      const c = raw[k];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '[') { if (depth === 0) start = k; depth++; }
      else if (c === ']') { depth--; if (depth === 0 && start >= 0) { parts.push(raw.slice(start, k + 1)); start = -1; } }
    }
    console.log(`blob ${i}: ${parts.length} top-level array doc(s)`);
    arr = parts.map(pp => JSON.parse(pp));
  }
  const first = Array.isArray(arr) ? arr[0] : arr;
  console.log(`=== blob ${i}  type=${Array.isArray(arr) ? 'array' : 'object'}  len=${arr.length}`);
  const dump = (x) => console.log('   ', JSON.stringify(x).slice(0, 260));
  if (Array.isArray(arr)) {
    arr.slice(0, 3).forEach(dump);
    console.log('    ...');
    arr.slice(-2).forEach(dump);
  } else {
    Object.keys(arr).slice(0, 3).forEach(k => console.log('   ', k, '=>', JSON.stringify(arr[k]).slice(0, 200)));
  }
}
