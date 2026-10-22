// Why does JSON.stringify(JSON.parse(text)) differ from the original text?
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
  baked.push({ text: dec.toString('utf8').replace(/\u0000+$/, '').trim(), parsed: p });
}
const byLen = baked.map(b => b.text);

for (let i = 2560; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim();
  const b = byLen.find(t => t === src);
  if (!b) { console.log(`${i}: not found in exe`); continue; }
  const round = JSON.stringify(JSON.parse(src));
  if (round === src) { console.log(`${i}: round-trip identical`); continue; }
  let k = 0;
  while (k < Math.min(round.length, src.length) && round[k] === src[k]) k++;
  console.log(`${i}: differs at ${k}`);
  console.log(`   src  : ${JSON.stringify(src.slice(Math.max(0, k - 40), k + 70))}`);
  console.log(`   round: ${JSON.stringify(round.slice(Math.max(0, k - 40), k + 70))}`);
  // count \\u escapes and suspicious numbers
  const uEsc = (src.match(/\\u[0-9a-fA-F]{4}/g) || []).length;
  const oddNum = (src.match(/:(-?\d+\.\d*[eE][-+]?\d+|-?\d+0\.)/g) || []).length;
  console.log(`   \\u escapes=${uEsc}  oddNumbers=${oddNum}`);
}
