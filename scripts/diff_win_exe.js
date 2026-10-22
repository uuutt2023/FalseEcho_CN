// Compare the exe baked text with the data.win copy for the mismatching blobs.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const { loadPool } = require('./exepool.js');

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const baked = [];
for (const it of items) {
  if (it.s.length < 100) continue;
  if (!/^[A-Za-z0-9+/=]+$/.test(it.s)) continue;
  let dec; try { dec = zlib.inflateSync(Buffer.from(it.s, 'base64')); } catch { continue; }
  let p; try { p = JSON.parse(dec.toString('utf8').replace(/\u0000+$/, '').trim()); } catch { continue; }
  baked.push({ off: it.off, text: dec.toString('utf8').replace(/\u0000+$/, '').trim(), parsed: p });
}
// map baked -> data.win blob by structural signature
const sig = (o) => {
  const k = Object.keys(o);
  return k.slice(0, 3).join('|') + '#' + k.length;
};
for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const parsed = JSON.parse(src);
  const b = baked.find(x => {
    if (Array.isArray(x.parsed) !== Array.isArray(parsed)) return false;
    if (Array.isArray(parsed)) return x.parsed.length === parsed.length && x.parsed[0][0] === parsed[0][0];
    return sig(x.parsed) === sig(parsed);
  });
  if (!b) { console.log(`${i}: no baked counterpart`); continue; }
  if (b.text === src) { console.log(`${i}: identical`); continue; }
  // find the differing part
  let k = 0;
  while (k < Math.min(b.text.length, src.length) && b.text[k] === src[k]) k++;
  console.log(`${i}: DIFFERS at char ${k}  exeLen=${b.text.length} winLen=${src.length}`);
  console.log(`    exe: ...${JSON.stringify(b.text.slice(Math.max(0, k - 60), k + 90))}`);
  console.log(`    win: ...${JSON.stringify(src.slice(Math.max(0, k - 60), k + 90))}`);
}
