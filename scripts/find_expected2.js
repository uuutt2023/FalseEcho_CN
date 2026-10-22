const fs = require('fs');
const root = 'E:/FalseEcho_CN';
function loadOrig(id) {
  const p = `${root}/extracted/blob_${id}.json`;
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8').replace(/[\u0000]+$/, '').trimEnd();
  try { return JSON.parse(raw); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
// 1) 找 mission blob 里的 expected 字段
for (const id of [2560, 2561, 2562, 2563, 2564]) {
  const v = loadOrig(id);
  if (!v) continue;
  const found = [];
  (function walk(n, path) {
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) {
        if (/expect|target|answer|input_text|typed/i.test(k)) found.push([path + '/' + k, n[k]]);
        walk(n[k], path + '/' + k);
      }
    }
  })(v, '');
  if (found.length) {
    console.log(`--- blob ${id}: ${found.length} 处 expected/target ---`);
    for (const [p, val] of found.slice(0, 25)) console.log(`   ${p} = ${JSON.stringify(val).slice(0, 160)}`);
  }
}
