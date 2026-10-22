// scan_exe_blobs.js —— 扫描 exe 里所有 base64+zlib 烘焙块，找含英文标题提示的块
const fs = require('fs');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const file = process.argv[2] || (root + '/backup_original/False Echo.exe');
const buf = fs.readFileSync(file);
const NEEDLE = process.argv[3] || 'PRESS ANY KEY TO START';

const B64 = /[A-Za-z0-9+/]{200,}={0,2}/g;
let m, n = 0, hits = 0;
const seen = new Set();
while ((m = B64.exec(buf.toString('latin1'))) !== null) {
  const s = m[0];
  if (seen.has(s)) continue;
  seen.add(s);
  let dec = null;
  try { dec = zlib.inflateSync(Buffer.from(s, 'base64')).toString('utf8'); } catch (e) { continue; }
  n++;
  const has = dec.indexOf(NEEDLE) >= 0;
  if (has) hits++;
  console.log((has ? '*** HIT *** ' : '          ') + 'off=0x' + m.index.toString(16) +
              ' b64len=' + s.length + ' declen=' + dec.length + '  head=' + JSON.stringify(dec.slice(0, 70)));
  if (n > 60) break;
}
console.log('blocks decoded:', n, ' hits:', hits);
