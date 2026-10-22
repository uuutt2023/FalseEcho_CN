// find_untranslated.js —— 找出表里「译文与原文完全相同」的条目 = 漏译
const fs = require('fs');
const path = require('path');
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
const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
let total = 0;
for (const id of [2575, 2576, 2577, 2578, 2579]) {
  const o = loadOrig(id), n = loadNew(id);
  const oMap = new Map(o.map(r => [String(r[0]), r]));
  for (const r of n) {
    if (!Array.isArray(r)) continue;
    const key = String(r[0]);
    const or = oMap.get(key);
    if (!or) continue;
    for (let c = 1; c < r.length; c++) {
      const nv = r[c], ov = or[c];
      if (typeof nv !== 'string' || typeof ov !== 'string') continue;
      if (nv === ov && /[A-Za-z]{3}/.test(nv) && nv.length > 6) {
        total++;
        console.log(`block ${id} [${key}] col${c}  未翻译:\n    ${JSON.stringify(nv).slice(0, 300)}`);
      }
    }
  }
}
console.log(`\n未翻译条目: ${total}`);
