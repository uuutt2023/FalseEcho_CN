const fs = require('fs');
const root = 'E:/FalseEcho_CN';
function loadOrig(id) {
  const raw = fs.readFileSync(`${root}/extracted/blob_${id}.json`, 'utf8').replace(/[\u0000]+$/, '').trimEnd();
  try { return JSON.parse(raw); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
function loadNew(id) {
  const raw = JSON.parse(fs.readFileSync(`${root}/apply/blobs.json`, 'utf8'))[String(id)];
  try { return JSON.parse(raw.replace(/[\u0000]+$/, '').trimEnd()); } catch (e) {
    const out = []; for (const l of raw.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e2) {} } return out;
  }
}
const want = process.argv.slice(2);
for (const id of [2575, 2576, 2577, 2578, 2579]) {
  const o = loadOrig(id), n = loadNew(id);
  const oMap = new Map(o.map(r => [String(r[0]), r]));
  const nMap = new Map(n.map(r => [String(r[0]), r]));
  console.log(`--- block ${id}: 原 ${o.length} 行 / 新 ${n.length} 行 ---`);
  // 新增的键
  for (const k of nMap.keys()) if (!oMap.has(k)) console.log(`  + 新增键 ${JSON.stringify(k)} = ${JSON.stringify(nMap.get(k).slice(1)).slice(0, 200)}`);
  // 消失的键
  for (const k of oMap.keys()) if (!nMap.has(k)) console.log(`  - 丢失键 ${JSON.stringify(k)} = ${JSON.stringify(oMap.get(k).slice(1)).slice(0, 200)}`);
  // 指定的键
  for (const k of want) {
    if (oMap.has(k) || nMap.has(k)) {
      console.log(`  * ${JSON.stringify(k)}\n      原: ${JSON.stringify(oMap.get(k)).slice(0, 300)}\n      新: ${JSON.stringify(nMap.get(k)).slice(0, 300)}`);
    }
  }
}
