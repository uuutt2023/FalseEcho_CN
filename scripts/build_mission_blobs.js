// Build the Chinese versions of the baked mission/step/dialogue blobs
// 2560..2574 and merge them into apply/blobs.json.
//
// The exe is the runtime source, so the base text is the EXACT text baked in
// the exe (base64+zlib).  Strings are replaced inside that raw text, so
// everything we do not touch stays byte-identical.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const { loadPool } = require('./exepool.js');

const TR = require(path.join(root, 'trans', 'mission_blob_cn.js'));

// ---------------------------------------------------------------- baked texts
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const baked = [];
for (const it of items) {
  if (it.s.length < 100) continue;
  if (!/^[A-Za-z0-9+/=]+$/.test(it.s)) continue;
  let dec; try { dec = zlib.inflateSync(Buffer.from(it.s, 'base64')); } catch { continue; }
  let p; try { p = JSON.parse(dec.toString('utf8').replace(/\u0000+$/, '').trim()); } catch { continue; }
  baked.push({ off: it.off, text: dec.toString('utf8').replace(/\u0000+$/, '').trim(), parsed: p });
}

// match each data.win blob id to its baked text (identical content)
function findBaked(srcText, parsed) {
  if (baked.some(b => b.text === srcText)) return baked.find(b => b.text === srcText);
  const sig = (o) => Object.keys(o).slice(0, 4).join('|') + '#' + Object.keys(o).length;
  if (Array.isArray(parsed)) {
    return baked.find(b => Array.isArray(b.parsed) && b.parsed.length === parsed.length &&
      JSON.stringify(b.parsed[0]) === JSON.stringify(parsed[0]));
  }
  return baked.find(b => !Array.isArray(b.parsed) && sig(b.parsed) === sig(parsed));
}

// ---------------------------------------------------------------- replacement
const esc = (s) => JSON.stringify(s).slice(1, -1);
function variants(s) {
  const base = esc(s);
  const set = new Set([base]);
  set.add(base.replace(/'/g, '\\u0027'));
  set.add(base.replace(/'/g, "\\'"));
  set.add(base.replace(/"/g, '\\u0022'));
  return [...set];
}
function replaceInText(text, en, cn) {
  const needle = variants(en).map(v => '"' + v + '"');
  for (const n of needle) {
    let idx = text.indexOf(n);
    if (idx < 0) continue;
    let count = 0, p = idx;
    while (p >= 0) { count++; p = text.indexOf(n, p + 1); }
    if (count < 1) return { ok: false, why: 'not found', text };
    // replace every occurrence of the same display string
    const out = text.split(n).join('"' + esc(cn) + '"');
    return { ok: true, text: out, count };
  }
  return { ok: false, why: 'not found', text };
}

// ---------------------------------------------------------------- build
const blobsPath = path.join(root, 'apply', 'blobs.json');
const blobs = JSON.parse(fs.readFileSync(blobsPath, 'utf8'));

for (const id of Object.keys(TR).map(Number).sort((a, b) => a - b)) {
  const p = path.join(root, 'extracted', `blob_${id}.json`);
  const src = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const parsed = JSON.parse(src);
  const b = findBaked(src, parsed);
  if (!b) { console.log(`!! blob ${id}: no baked counterpart in exe`); continue; }
  let text = b.text;
  console.log(`\nblob ${id}  baked@0x${b.off.toString(16)}  len=${text.length}`);
  for (const [en, cn] of Object.entries(TR[id])) {
    const r = replaceInText(text, en, cn);
    if (!r.ok) { console.log(`   !! ${JSON.stringify(en.slice(0, 60))} : ${r.why}`); continue; }
    text = r.text;
    console.log(`   ok  ${JSON.stringify(en.slice(0, 55))} -> ${JSON.stringify(cn.slice(0, 40))}`);
  }
  // structural sanity: same shape, only string values changed
  const newParsed = JSON.parse(text);
  const shape = (o) => {
    if (Array.isArray(o)) return o.map(shape);
    if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).map(k => [k, shape(o[k])]));
    return typeof o;
  };
  if (JSON.stringify(shape(newParsed)) !== JSON.stringify(shape(parsed))) {
    console.log(`   !! SHAPE CHANGED`);
    continue;
  }
  blobs[String(id)] = text;
  console.log(`   -> new length ${text.length} (was ${b.text.length})`);
}

fs.writeFileSync(blobsPath, JSON.stringify(blobs, null, 1), 'utf8');
console.log(`\n-> ${blobsPath} (${Object.keys(blobs).length} blobs)`);
