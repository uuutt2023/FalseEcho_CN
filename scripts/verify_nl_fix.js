// 校验：修复后各块的中文「正文内容」（去掉所有换行/留白）与修复前完全一致
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const BLOB_IDS = ['2561', '2566', '2568', '2574', '2575', '2576', '2577', '2578', '2579'];

const now = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));
const old = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json.bak_before_nl'), 'utf8').replace(/\0/g, ''));

function strip(s) {
  return s
    .replace(/\\r\\n/g, '').replace(/\\n/g, '').replace(/\\r/g, '')
    .replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '');
}

let bad = 0, checked = 0;
for (const id of BLOB_IDS) {
  const a = JSON.parse(old[id].replace(/\0+$/, ''));
  const b = JSON.parse(now[id].replace(/\0+$/, ''));
  const diffs = [];
  (function walk(x, y, p) {
    if (typeof x === 'string' || typeof y === 'string') {
      checked++;
      if (strip(String(x)) !== strip(String(y))) diffs.push(p);
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) { diffs.push(p + ' len'); return; }
      for (let i = 0; i < x.length; i++) walk(x[i], y[i], p + '[' + i + ']');
      return;
    }
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      const kx = Object.keys(x), ky = Object.keys(y);
      if (kx.length !== ky.length) { diffs.push(p + ' keys'); return; }
      for (const k of kx) if (k in y) walk(x[k], y[k], p + '.' + k);
      return;
    }
    if (x !== y) diffs.push(p);
  })(a, b, '');
  console.log(`block ${id}: 内容差异项=${diffs.length}${diffs.length ? ' -> ' + diffs.slice(0, 5).join(', ') : ''}`);
  bad += diffs.length;
}
console.log(`\n比较字符串数=${checked}  内容差异=${bad}  => ${bad === 0 ? '内容完好，仅换行结构变化' : '存在内容差异，需检查'}`);
