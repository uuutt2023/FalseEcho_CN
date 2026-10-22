// List literal display strings inside decoded blobs that are not localization keys.
const fs = require('fs');
const path = require('path');

const locDir = path.join(__dirname, '..', 'decoded');
const locKeys = new Set();
{
  const t = fs.readFileSync(path.join(locDir, 'b2578.txt'), 'utf8').replace(/\0/g, '');
  const arr = JSON.parse(t);
  for (const row of arr) locKeys.add(row[0]);
}
console.log('localization keys:', locKeys.size);

const files = process.argv.slice(2);
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8').replace(/\0/g, '');
  let obj;
  try { obj = JSON.parse(raw); } catch (e) { console.log(f, 'PARSE FAIL', e.message); continue; }
  const found = [];
  (function walk(v, pathStr) {
    if (typeof v === 'string') {
      if (locKeys.has(v)) return;
      if (/^[A-Za-z0-9_\-]+$/.test(v) && v.length < 40) return; // technical id
      if (v.length >= 2) found.push([pathStr, v]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${pathStr}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${pathStr}.${k}`);
  })(obj, '');
  console.log(`\n=== ${path.basename(f)} : ${found.length} literal values ===`);
  for (const [p, v] of found) console.log(`  ${p} => ${JSON.stringify(v).slice(0, 400)}`);
}
