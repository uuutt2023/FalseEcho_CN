// ============================================================================
// analyze_break.js 鈥斺€?鍒嗘瀽 EN-\n 缁撴瀯鐨勪腑鏂囦覆锛屽垎鏋愭瘡琛屽搴﹂绠?// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
function uOf(s) { let u = 0; for (const ch of s) u += CJK_RE.test(ch) ? 1 : 0.5; return u; }
function splitLines(s) { return s.split(/\r\n|\n|\r/); }
function parseBlob(raw) {
  const clean = raw.replace(CTRL, '');
  const m = clean.match(/^[\s\S]*?(?=\s*[\u0000-\u0008\u000b\u000c\u000e-\u001f]|$)/);
  return JSON.parse(clean);
}

const pre = JSON.parse(fs.readFileSync(path.join(root, 'backup_prebreak', 'blobs.json.bak'), 'utf8'));
const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));

function loadEn(id) {
  const p = path.join(root, 'extracted', 'blob_' + id + '.json');
  if (!fs.existsSync(p)) return null;
  return parseBlob(fs.readFileSync(p, 'utf8'));
}

function flatten(node, out, pfx) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'string' && typeof v[1] === 'string') {
        const rowKey = CJK_RE.test(v[0]) ? '' : v[0];
        for (let c = rowKey ? 1 : 0; c < v.length; c++) {
          if (typeof v[c] === 'string') out.push({ key: rowKey, val: v[c], path: pfx + '[' + i + '][' + c + ']' });
        }
      } else if (typeof v === 'string') {
        out.push({ key: pfx, val: v, path: pfx + '[' + i + ']' });
      } else flatten(v, out, pfx + '[' + i + ']');
    }
    return out;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string') out.push({ key: k, val: v, path: pfx + '.' + k });
      else flatten(v, out, pfx + '.' + k);
    }
  }
  return out;
}

let stat = { total: 0, withN: 0, extraCrlf: 0, sameCrlf: 0, noCn: 0 };
const rows = [];

for (const id of Object.keys(pre)) {
  const en = loadEn(id);
  if (!en) { console.log('no EN for blob ' + id); continue; }
  const enRows = flatten(en, [], '');
  const preRows = flatten(parseBlob(pre[id]), [], '');
  const curRows = flatten(parseBlob(cur[id]), [], '');
  const preMap = new Map(preRows.map(r => [r.path, r.val]));
  const curMap = new Map(curRows.map(r => [r.path, r.val]));
  for (const er of enRows) {
    stat.total++;
    if (!er.val.includes('\n') && !er.val.includes('\r')) continue;
    stat.withN++;
    const preV = preMap.get(er.path);
    const curV = curMap.get(er.path);
    if (preV === undefined) { stat.noCn++; continue; }
    const enL = splitLines(er.val);
    const preL = splitLines(preV);
    const curL = splitLines(curV === undefined ? preV : curV);
    const extra = curL.length - preL.length;
    if (extra > 0) {
      stat.extraCrlf++;
      rows.push({ id, path: er.path, key: er.key, enLines: enL.length, preLines: preL.length, curLines: curL.length,
                  en: er.val, pre: preV, cur: curV });
    } else stat.sameCrlf++;
  }
}
console.log(JSON.stringify(stat, null, 1));
console.log('extra-crlf strings: ' + rows.length);

let idx = 0;
for (const r of rows) {
  const enL = splitLines(r.en), preL = splitLines(r.pre);
  console.log('\n### [' + r.id + '] ' + r.path + '  key=' + JSON.stringify(r.key));
  console.log('  EN  lines=' + enL.length + ' : ' + JSON.stringify(enL.map(l => uOf(l))));
  console.log('  PRE lines=' + preL.length + ' : ' + JSON.stringify(preL.map(l => uOf(l))));
  console.log('  CUR lines=' + r.curLines + ' : ' + JSON.stringify(splitLines(r.cur).map(l => uOf(l))));
  for (let i = 0; i < Math.min(enL.length, preL.length); i++) {
    console.log('   [' + i + '] EN=' + JSON.stringify(enL[i]));
    console.log('        CN=' + JSON.stringify(preL[i]) + '  (enU=' + uOf(enL[i]).toFixed(1) + ' cnU=' + uOf(preL[i]).toFixed(1) + ')');
  }
  if (++idx >= Number(process.env.LIMIT || 12)) break;
}

