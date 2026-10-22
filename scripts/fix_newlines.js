// 修复 CN 块中的换行表示
//  1) 中文值里的字面量 "\n" / "\r\n"（反斜杠+n 等）→ 真实换行
//  2) 若中文分段数与英文「内容段」数一致 → 用英文的分隔符结构（含版面留白长串）重建
//  3) 否则 → 中文自身的换行结构 1:1 转换（保留中文自有的空行分组）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const BLOB_IDS = ['2561', '2566', '2568', '2574', '2575', '2576', '2577', '2578', '2579'];
const DRY = process.argv.includes('--dry');

function readJsonText(file) {
  let s = fs.readFileSync(file, 'utf8').replace(/\0/g, '');
  return JSON.parse(s.replace(/\0+$/, ''));
}

// 分词：segs[i] 后跟 seps[i]（最后一个 seps 为空串）
function tokenize(v, literalAware) {
  const segs = [], seps = [];
  let cur = '';
  const endSeg = (sep) => { segs.push(cur); seps.push(sep); cur = ''; };
  let i = 0;
  while (i < v.length) {
    const c = v[i];
    if (literalAware && c === '\\') {
      const n = v[i + 1];
      if (n === 'n') { endSeg('\\n'); i += 2; continue; }
      if (n === 'r') {
        if (v[i + 2] === '\\' && v[i + 3] === 'n') { endSeg('\\r\\n'); i += 4; continue; }
        endSeg('\\r'); i += 2; continue;
      }
      cur += c; i++; continue;
    }
    if (c === '\r') {
      if (v[i + 1] === '\n') { endSeg('\r\n'); i += 2; continue; }
      endSeg('\r'); i++; continue;
    }
    if (c === '\n') { endSeg('\n'); i++; continue; }
    cur += c; i++;
  }
  segs.push(cur);
  return { segs, seps };
}

function literalToReal(sep) {
  if (sep === '\\r\\n') return '\r\n';
  if (sep === '\\n') return '\r\n';
  if (sep === '\\r') return '\r';
  return sep;
}

function hasLiteralSep(v) {
  return /\\(\r\\n|r|n)/.test(v);
}

function rebuild(en, cn) {
  const E = tokenize(en, false);
  const C = tokenize(cn, true);
  const contentIdx = [];
  E.segs.forEach((s, i) => { if (s.length > 0) contentIdx.push(i); });
  // CN 侧只取非空内容段（连续转义产生的空段只是留白）
  const cnContent = [];
  C.segs.forEach((s, i) => { if (s.length > 0) cnContent.push(s); });
  if (contentIdx.length !== cnContent.length) return null;

  let out = '';
  for (let k = 0; k < contentIdx.length; k++) {
    out += cnContent[k];
    if (k < contentIdx.length - 1) {
      const a = contentIdx[k], b = contentIdx[k + 1];
      for (let j = a; j < b; j++) out += E.seps[j];
    }
  }
  const last = contentIdx[contentIdx.length - 1];
  for (let j = last; j < E.seps.length - 1; j++) out += E.seps[j];
  return out;
}

function convertOnly(cn) {
  const C = tokenize(cn, true);
  let out = '';
  for (let i = 0; i < C.segs.length; i++) {
    out += C.segs[i];
    if (i < C.seps.length - 1) out += literalToReal(C.seps[i]);
  }
  return out;
}

const rawFile = path.join(D, 'apply/blobs.json');
const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8').replace(/\0/g, ''));
let gFixed = 0, gAligned = 0, gConv = 0, gUnaligned = 0;

for (const id of BLOB_IDS) {
  const enFile = path.join(D, 'decoded', 'b' + id + '.txt');
  if (!fs.existsSync(enFile)) continue;
  const en = readJsonText(enFile);
  const cn = JSON.parse(raw[id].replace(/\0+$/, ''));
  let fixed = 0, aligned = 0, conv = 0;
  const unaligned = [];

  (function walk(e, c, p) {
    if (typeof c === 'string') {
      if (!hasLiteralSep(c)) return c;
      if (typeof e !== 'string') { unaligned.push([p, 'EN 非字符串']); return convertOnly(c); }
      const r = rebuild(e, c);
      if (r === null) { unaligned.push([p, '段数不匹配']); conv++; fixed++; return convertOnly(c); }
      aligned++; fixed++;
      return r;
    }
    if (Array.isArray(c)) {
      if (!Array.isArray(e) || e.length !== c.length) return c;
      for (let i = 0; i < c.length; i++) c[i] = walk(e[i], c[i], p + '[' + i + ']');
      return c;
    }
    if (c && typeof c === 'object') {
      if (!e || typeof e !== 'object' || Array.isArray(e)) return c;
      for (const k of Object.keys(c)) if (k in e) c[k] = walk(e[k], c[k], p + '.' + k);
      return c;
    }
    return c;
  })(en, cn, '');

  console.log(`block ${id}: 修复=${fixed} (英文结构对齐=${aligned}, 自身结构转换=${conv})`);
  for (const u of unaligned.slice(0, 6)) console.log('    ~ ' + u[0] + ' :: ' + u[1]);
  gFixed += fixed; gAligned += aligned; gConv += conv; gUnaligned += unaligned.length;

  raw[id] = JSON.stringify(cn) + '\0';
}
console.log(`\n合计: 修复=${gFixed} 对齐=${gAligned} 转换=${gConv} 未对齐项=${gUnaligned}`);
if (!DRY) {
  fs.writeFileSync(rawFile, JSON.stringify(raw, null, 0), 'utf8');
  console.log('已写回 apply/blobs.json');
} else {
  console.log('（dry-run，未写回）');
}
