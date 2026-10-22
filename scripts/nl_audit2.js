// 逐块解析 CN 与 EN，统计「字面量 \n」与真实换行
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const LIT = '\\n';

function parseBlock(id) {
  const p = path.join(D, 'decoded', 'b' + id + '.txt');
  const s = fs.readFileSync(p, 'utf8').replace(/\0/g, '');
  return JSON.parse(s);
}

const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));
for (const b of Object.keys(raw)) {
  let cn, en;
  try { cn = JSON.parse(raw[b]); } catch (e) { console.log(`block ${b} CN parse fail: ${e.message}`); continue; }
  try { en = parseBlock(b); } catch (e) { console.log(`block ${b} EN parse fail: ${e.message}`); continue; }

  // 收集 CN 侧所有字符串值
  const cnStrings = [];
  (function walk(v, p) {
    if (typeof v === 'string') cnStrings.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p + '.' + k);
  })(cn, '');

  const enStrings = [];
  (function walk(v, p) {
    if (typeof v === 'string') enStrings.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p + '.' + k);
  })(en, '');

  const enLit = enStrings.filter(([, v]) => v.indexOf(LIT) >= 0).length;
  const enReal = enStrings.filter(([, v]) => v.indexOf('\n') >= 0).length;
  const cnLit = cnStrings.filter(([, v]) => v.indexOf(LIT) >= 0).length;
  const cnReal = cnStrings.filter(([, v]) => v.indexOf('\n') >= 0).length;
  console.log(`block ${b}: EN(str=${enStrings.length} lit=${enLit} real=${enReal})  CN(str=${cnStrings.length} lit=${cnLit} real=${cnReal})`);
}
