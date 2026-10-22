// ============================================================================
// break_long.js —— 把超长的中文行按断行规则重排（插入真实 CRLF）
//
// 背景：游戏对白/文档按空格自动换行（英文），中文无空格 → 整行溢出被纸面裁切。
//       纸面可用宽度实测约 180 游戏 px，中文 advance 10 → 每行约 16-17 字。
//
// 断行规则（词元级，保证英文单词/标识符不被劈开）：
//   · 英文/数字/下划线连续串是一个不可分割的词元（TRUE、Discord、txt_xxx_01）
//   · 汉字之间可任意断行
//   · 后置标点（。，、！？」…）跟随上一单元，不得出现在行首
//   · 前置标点（「（《）跟随下一单元，不得出现在行尾
//   · 含对齐留白的表格行按“列”断行，不劈开单元格
//   · 密文/校验/输入比对目标（msg_dec_、msg_enc_、*_cipher_*、*_decoded_* …）不动
//   · 没有实际发生断行的字符串一律保持原样（含原有换行风格）
//
// 用法: node scripts/break_long.js [--limit 16] [--apply] [--report]
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const argv = process.argv.slice(2);
const li = argv.indexOf('--limit');
const limit = li >= 0 ? +argv[li + 1] : 16;
const apply = argv.includes('--apply');
const report = argv.includes('--report');
const SAMPLE_MAX = +(process.env.BREAK_SAMPLE || 0);

const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
const LAT_RE = /[0-9A-Za-z_]/;
// 后置标点：跟随上一单元
const HANG = '。！？；：，、）】」』》”’…—·％%';
// 前置标点：跟随下一单元
const OPEN = '（【「『《“‘';
const SKIP_ALWAYS = /^(msg_dec_|msg_enc_|t_msg_)|_cipher_/;
// 其它"密文类"键（*_decoded_*、day_99_txt_msg_*）若值仍为英文，由"无中文不改"规则
// 天然跳过；若值已是中文（本地化后的展示文本），则允许断行。
const SKIP_VALUE_KEY = /^(expected|expected_value|answer|solution|target_text|input_target)$/;
// 表格对齐留白：3 个以上半角空格，或 2 个以上全角空格
const COL_SEP = /((?: {3,})|(?:\u3000{2,}))/;

function uOf(s) { let u = 0; for (const ch of s) u += CJK_RE.test(ch) ? 1 : 0.5; return u; }

// ---------------------------------------------------------------- 词元化
function tokenize(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (LAT_RE.test(ch)) {
      let j = i; while (j < line.length && LAT_RE.test(line[j])) j++;
      const t = line.slice(i, j);
      out.push({ t, u: t.length * 0.5, kind: 'lat' });
      i = j; continue;
    }
    if (ch === ' ' || ch === '\t') {
      let j = i; while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
      out.push({ t: line.slice(i, j), u: (j - i) * 0.5, kind: 'sp' });
      i = j; continue;
    }
    if (OPEN.includes(ch)) {
      let t = ch, j = i + 1;
      while (j < line.length && OPEN.includes(line[j])) { t += line[j]; j++; }
      out.push({ t, u: t.length, kind: 'open' });
      i = j; continue;
    }
    if (HANG.includes(ch)) { out.push({ t: ch, u: 1, kind: 'hang' }); i++; continue; }
    if (CJK_RE.test(ch)) { out.push({ t: ch, u: 1, kind: 'cjk' }); i++; continue; }
    out.push({ t: ch, u: 0.5, kind: 'lat' });   // 其它 ASCII 标点
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- 贪心装填
function packUnits(units) {
  const lines = [];
  let cur = [], curU = 0;
  for (const un of units) {
    if (un.kind === 'sp') {
      if (!cur.length) continue;                    // 行首空白已由 lead 单独保留
      cur.push(un); curU += un.u; continue;         // 空格永远保留（允许轻微溢出）
    }
    if (cur.length && curU + un.u > limit && un.kind !== 'hang' && un.kind !== 'open') {
      // 断行：行尾的开括号带到下一行（行尾空白保留，不丢字符）
      const carry = [];
      while (cur.length && cur[cur.length - 1].kind === 'open') carry.unshift(cur.pop());
      if (cur.length) lines.push(cur);
      cur = carry; curU = cur.reduce((a, b) => a + b.u, 0);
    }
    cur.push(un); curU += un.u;
  }
  if (cur.length) lines.push(cur);
  return lines.map(l => l.map(x => x.t).join(''));
}

// ---------------------------------------------------------------- 表格行
function splitColumns(line) {
  const parts = line.split(COL_SEP);
  if (parts.length < 3) return null;
  const items = [];
  for (let i = 0; i < parts.length; i += 2) {
    items.push({ sep: i === 0 ? '' : parts[i - 1], text: parts[i] });
  }
  return items;
}
function packColumns(items) {
  const out = [];
  let cur = '';
  for (const it of items) {
    const piece = it.sep + it.text;
    if (!cur) { cur = piece; continue; }
    if (uOf(cur + piece) <= limit) { cur += piece; continue; }
    out.push(cur);
    cur = piece;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------------------------------------------------------------- 孤字回补
function fixOrphan(lines) {
  if (lines.length < 2) return lines;
  const last = lines[lines.length - 1];
  if (uOf(last) > 2) return lines;
  const prevChars = Array.from(lines[lines.length - 2]);
  if (prevChars.length < 2) return lines;
  const ch = prevChars[prevChars.length - 1];
  if (!CJK_RE.test(ch)) return lines;
  prevChars.pop();
  lines[lines.length - 2] = prevChars.join('');
  lines[lines.length - 1] = ch + last;
  return lines;
}

// ---------------------------------------------------------------- 单行断行
function breakLine(line) {
  if (uOf(line) <= limit) return [line];
  // 行首缩进单独保留（断行不得丢字符）
  const lead = (line.match(/^[ \t\u3000]*/) || [''])[0];
  const body = line.slice(lead.length);
  let out = null;
  const cols = splitColumns(body);
  if (cols) {
    const packed = packColumns(cols);
    if (packed.every(l => uOf(l) <= limit + 1)) out = packed;
  }
  if (!out) out = packUnits(tokenize(body));
  out = fixOrphan(out);
  if (lead && out.length) out[0] = lead + out[0];
  return out;
}

// ---------------------------------------------------------------- 字符串变换
function transform(s, key) {
  if (typeof s !== 'string' || !s) return s;
  if (key && SKIP_ALWAYS.test(key)) return s;
  if (key && SKIP_VALUE_KEY.test(key)) return s;
  if (!CJK_RE.test(s)) return s;                 // 纯英文不动
  const lines = s.split(/\r\n|\n|\r/);
  const out = [];
  let broke = false;
  for (const L of lines) {
    const parts = breakLine(L);
    if (parts.length > 1) broke = true;
    for (const p of parts) out.push(p);
  }
  if (!broke) return s;                          // 未发生断行 → 原样保留
  return out.join('\r\n');
}

// ---------------------------------------------------------------- 遍历
const SAMPLES = [];
function sample(where, key, before, after) {
  if (SAMPLES.length < SAMPLE_MAX) SAMPLES.push({ where, key, before, after });
}

function transformNode(node, parentKey, where) {
  let changed = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'string' && typeof v[1] === 'string') {
        // [key, value, ...] 行；v[0] 含中文时它本身也是内容（规则表），需一并处理
        const rowKey = CJK_RE.test(v[0]) ? '' : v[0];
        for (let c = rowKey ? 1 : 0; c < v.length; c++) {
          if (typeof v[c] !== 'string') continue;
          const old = v[c];
          const t = transform(old, rowKey);
          if (t !== old) { v[c] = t; changed = true; sample(where, rowKey || String(c), old, t); }
        }
      } else if (typeof v === 'string') {
        const t = transform(v, parentKey);
        if (t !== v) { node[i] = t; changed = true; sample(where, parentKey, v, t); }
      } else if (transformNode(v, parentKey, where)) changed = true;
    }
    return changed;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string') {
        const t = transform(v, k);
        if (t !== v) { node[k] = t; changed = true; sample(where, k, v, t); }
      } else if (transformNode(v, k, where)) changed = true;
    }
    return changed;
  }
  return false;
}

const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
function transformBlob(raw, where) {
  const clean = raw.replace(CTRL, '');
  const tail = (raw.match(CTRL) || []).join('');
  let node;
  try { node = JSON.parse(clean); } catch (e) { return { raw, changed: false }; }
  const changed = transformNode(node, '', where);
  if (!changed) return { raw, changed: false };
  return { raw: JSON.stringify(node) + tail, changed: true };
}

// ---------------------------------------------------------------- 主流程
let total = 0;
const mapPath = path.join(root, 'trans', 'literal_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const mapTrans = new Map();                       // 译文原文 -> 断行后
{
  let n = 0;
  for (const k of Object.keys(map)) {
    const t = transform(map[k], k);                // 用 EN 键判定是否跳过
    mapTrans.set(map[k], t);
    if (t !== map[k]) { map[k] = t; n++; }
  }
  total += n; console.log(`literal_map.json: ${n} 条`);
  if (apply) fs.writeFileSync(mapPath, JSON.stringify(map, null, 1), 'utf8');
}
{
  const p = path.join(root, 'apply', 'blobs.json');
  const blobs = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const k of Object.keys(blobs)) {
    const r = transformBlob(blobs[k], 'blob' + k);
    if (r.changed) { blobs[k] = r.raw; n++; }
  }
  total += n; console.log(`blobs.json: ${n} 块`);
  if (apply) fs.writeFileSync(p, JSON.stringify(blobs, null, 1), 'utf8');
}
{
  const p = path.join(root, 'apply', 'exe_spec.json');
  const spec = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const l of spec.literals || []) {
    const t = mapTrans.has(l.text) ? mapTrans.get(l.text) : transform(l.text, '');
    if (t !== l.text) { l.text = t; n++; }
  }
  let nb = 0;
  for (const k of Object.keys(spec.blobs || {})) {
    const r = transformBlob(spec.blobs[k], 'spec' + k);
    if (r.changed) { spec.blobs[k] = r.raw; nb++; }
  }
  total += n + nb; console.log(`exe_spec.json: ${n} 条字面量, ${nb} 块`);
  if (apply) fs.writeFileSync(p, JSON.stringify(spec, null, 1), 'utf8');
}
console.log(`合计改动条目: ${total}  ${apply ? '(已写入)' : '(dry-run)'}`);

for (const s of SAMPLES) {
  console.log(`--- ${s.where} ${s.key}`);
  console.log('  - ' + JSON.stringify(s.before.length > 150 ? s.before.slice(0, 150) + '...' : s.before));
  console.log('  + ' + JSON.stringify(s.after.length > 150 ? s.after.slice(0, 150) + '...' : s.after));
}

// ---------------------------------------------------------------- 残余长行报告
if (report) {
  const rows = [];
  const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
  const cjkCount = s => (s.match(/[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/g) || []).length;
  for (const [idx, raw] of Object.entries(blobs)) {
    let node;
    try { node = JSON.parse(raw.replace(CTRL, '')); } catch (e) { continue; }
    (function walk(n, p) {
      if (typeof n === 'string') {
        for (const L of n.split(/\r\n|\n|\r/)) {
          const c = cjkCount(L);
          if (c > limit) rows.push({ where: `blob${idx}${p}`, len: c, cn: L });
        }
        return;
      }
      if (Array.isArray(n)) { n.forEach((v, i) => walk(v, `${p}[${i}]`)); return; }
      if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], `${p}.${k}`);
    })(node, '');
  }
  console.log(`\n=== 断行后仍 > ${limit} 字的行: ${rows.length} ===`);
  rows.sort((a, b) => b.len - a.len);
  for (const r of rows.slice(0, 60)) {
    console.log(`[${r.len}] ${r.where}`);
    console.log('    ' + JSON.stringify(r.cn.length > 130 ? r.cn.slice(0, 130) + '...' : r.cn));
  }
}
