const fs = require('fs');
const root = 'E:/FalseEcho_CN';
function loadOrig(id) {
  const raw = fs.readFileSync(`${root}/extracted/blob_${id}.json`, 'utf8').replace(/[\u0000]+$/, '').trimEnd();
  try { return JSON.parse(raw); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
const rows = loadOrig(2578);
const keys = rows.map(r => String(r[0]));
console.log('--- 含 day_02_txt 的键（前 60 个）---');
for (const k of keys.filter(k => k.startsWith('day_02_txt')).slice(0, 60)) console.log('  ' + k);
console.log('--- cipher / encode / decode 键统计 ---');
for (const pat of ['cipher', 'enc', 'dec', 'msg_']) {
  const m = keys.filter(k => k.includes(pat));
  console.log(`  ${pat}: ${m.length} 个 -> ${m.slice(0, 8).join(', ')}${m.length > 8 ? ' ...' : ''}`);
}
