// ============================================================================
// break_v2.js —— 基于「英文原行宽预算」的重排断行（cn10）
//
// 背景（cn9 实测结论）：
//   1. 游戏内所有文本渲染器（纸面对白、文档页、GUI 对话框）都按「空格」分词自动折行，
//      英文因此总是能正确换行；中文没有空格才会出问题。
//   2. cn8 用「硬换行 CRLF」分词 → 渲染出的行数与游戏内部按空格统计的行数不一致，
//      文字互相叠字。cn9 把 CRLF 换成空格后叠字消失。
//   3. 但 cn9 的换行点固定在 16 个 CJK 单位，与实际容器宽度无关：
//      · 宽对话框（教程框约 42 单位）被硬拆成两行，明明一行放得下；
//      · 固定版式文档（前线新闻/名册/战争日记）里插入的 CRLF 与原文换行混在一起，
//        同样存在行数统计与渲染不一致的风险。
//
// 本脚本（cn10）规则：
//   · 保留英文原串自带的换行结构（段落/表格行一律不动）。
//   · 中文行宽 <= LIMIT(16)          → 不动（最窄容器也能放下）
//   · 中文行宽 <= 英文原行宽 且 英文原行宽 <= EN_SHORT → 不动
//        （英文原行本身就短到能单行显示，中文更窄，同样单行显示；
//          这条修掉了「教程框被硬拆两行」的问题）
//   · 其余 → 拆成 <= LIMIT 的词元段，用「空格」连接，交给游戏自己的折行算法，
//        不再插入硬换行（行数统计与渲染重新一致）。
//   · 电报纸条等固定高度版式（键名命中 KEEP_RE）保持 cn9 原样，不做改动。
//
// 不变量：只允许插入「换行/空格」，不增删任何字符。
// 用法: node scripts/break_v2.js [--apply] [--report]
// ============================================================================
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const argv = process.argv.slice(2);
const LOG = [];
function log(...a){ LOG.push(a.map(x=>typeof x==='string'?x:String(x)).join(' ')); console.log.apply(console, a); }
const REPORT_FILE = process.env.BREAK_REPORT || null;
const apply = argv.includes('--apply');
const LIMIT = +(process.env.BREAK_LIMIT || 16);
const SENT_MAX = +(process.env.BREAK_SENTMAX || 20);
const EN_SHORT = +(process.env.BREAK_ENSHORT || 26);
const EN_SHORT_BLOB = +(process.env.BREAK_ENSHORT_BLOB || 18);

const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
const LAT_RE = /[0-9A-Za-z_]/;
const HANG = '。！？；：，、）】」』》”’…—·％%';
const OPEN = '（【「『《“‘';
const SKIP_ALWAYS = /^(msg_dec_|msg_enc_|t_msg_)|_cipher_/;
const SKIP_VALUE_KEY = /^(expected|expected_value|answer|solution|target_text|input_target)$/;
const KEEP_RE = /(_message|_decoded|_msg_|_msg$|txt_verm_|msg_dec_|msg_enc_)/;
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;

function uOf(s) { let u = 0; for (const ch of s) u += CJK_RE.test(ch) ? 1 : 0.5; return u; }
function splitLines(s) { return s.split(/\r\n|\n|\r/); }

function tokenize(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (LAT_RE.test(ch)) {
      let j = i; while (j < line.length && LAT_RE.test(line[j])) j++;
      const t = line.slice(i, j);
      out.push({ t, u: t.length * 0.5, kind: 'lat' }); i = j; continue;
    }
    if (ch === ' ' || ch === '\t') {
      let j = i; while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
      out.push({ t: line.slice(i, j), u: (j - i) * 0.5, kind: 'sp' }); i = j; continue;
    }
    if (OPEN.includes(ch)) {
      let t = ch, j = i + 1;
      while (j < line.length && OPEN.includes(line[j])) { t += line[j]; j++; }
      out.push({ t, u: t.length, kind: 'open' }); i = j; continue;
    }
    if (HANG.includes(ch)) { out.push({ t: ch, u: 1, kind: 'hang' }); i++; continue; }
    if (CJK_RE.test(ch)) { out.push({ t: ch, u: 1, kind: 'cjk' }); i++; continue; }
    out.push({ t: ch, u: 0.5, kind: 'lat' }); i++;
  }
  return out;
}

// 把一行的词元装进 <= limit 的若干段（返回段的数组）
function packUnits(units, limit) {
  const segs = [];
  let cur = [], curU = 0;
  for (const un of units) {
    if (un.kind === 'sp') { if (!cur.length) continue; cur.push(un); curU += un.u; continue; }
    if (cur.length && curU + un.u > limit && un.kind !== 'hang' && un.kind !== 'open') {
      const carry = [];
      while (cur.length && cur[cur.length - 1].kind === 'open') carry.unshift(cur.pop());
      if (cur.length) segs.push(cur);
      cur = carry; curU = cur.reduce((a, b) => a + b.u, 0);
    }
    cur.push(un); curU += un.u;
  }
  if (cur.length) segs.push(cur);
  return segs.map(s => s.map(x => x.t).join(''));
}

// 用空格连接各段（段尾已有空格则不再补空格，避免出现双空格且不丢字符）
function joinWithSpace(segs) {
  let out = '';
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (i === 0) { out = s; continue; }
    out += (/\s$/.test(out) ? '' : ' ') + s;
  }
  return out;
}

// 行的处理：返回该行的新文本
const SENT_END = /[。！？…]$/;
function processLine(cnLine, enLine, enShort) {
  const cnU = uOf(cnLine);
  if (cnU <= LIMIT) return cnLine;                            // 规则2：放得下
  if (SENT_END.test(cnLine) && cnU <= SENT_MAX) return cnLine; // 规则2b：已是自然句读，不拆
  if (enLine !== null && enLine !== undefined) {
    const enU = uOf(enLine);
    if (cnU <= enU && enU <= enShort) return cnLine;          // 规则3：不比英文原行宽
  }
  const lead = (cnLine.match(/^[ \t\u3000]*/) || [''])[0];
  const body = cnLine.slice(lead.length);
  const segs = packUnits(tokenize(body), LIMIT);
  if (segs.length <= 1) return cnLine;
  return lead + joinWithSpace(segs);
}

// 整个字符串的处理：逐行对齐（英文第 i 行 ↔ 中文第 i 行）
function processString(cn, en, enShort, ctx) {
  if (typeof cn !== 'string' || !cn) return cn;
  if (!CJK_RE.test(cn)) return cn;                     // 纯英文/纯键名不动
  const cnL = splitLines(cn);
  const enL = (typeof en === 'string' && en) ? splitLines(en) : null;
  const out = [];
  let changed = false;
  for (let i = 0; i < cnL.length; i++) {
    const enLine = enL ? (i < enL.length ? enL[i] : null) : null;
    const t = processLine(cnL[i], enLine, enShort);
    if (t !== cnL[i]) {
      changed = true;
      if (ctx) ctx.push({ where: ctx.where, key: ctx.key, cn: cnL[i], en: enLine, out: t });
    }
    out.push(t);
  }
  if (!changed) return cn;
  return out.join('\r\n');
}

// ---------------------------------------------------------------- 遍历
function transformNode(enNode, cnNode, ctx, pfx, key, enShort) {
  if (typeof cnNode === 'string') {
    return processString(cnNode, typeof enNode === 'string' ? enNode : null, enShort, ctx);
  }
  if (Array.isArray(cnNode)) {
    // [key, value...] 行：列 0 若是键（英文中文相同）则按 rowKey 处理跳过规则
    for (let i = 0; i < cnNode.length; i++) {
      const cv = cnNode[i], ev = Array.isArray(enNode) ? enNode[i] : undefined;
      if (Array.isArray(cv) && cv.length >= 2 && typeof cv[0] === 'string' && typeof cv[1] === 'string') {
        const enRowKey = (Array.isArray(ev) && typeof ev[0] === 'string') ? ev[0] : '';
        const sameKey = (ev && Array.isArray(ev) && ev[0] === cv[0]);
        const rowKey = sameKey ? enRowKey : '';
        const startCol = sameKey ? 1 : 0;
        for (let c = startCol; c < cv.length; c++) {
          if (typeof cv[c] !== 'string') continue;
          if (rowKey && (SKIP_ALWAYS.test(rowKey) || SKIP_VALUE_KEY.test(rowKey) || KEEP_RE.test(rowKey))) continue;
          const evc = (Array.isArray(ev) && typeof ev[c] === 'string') ? ev[c] : null;
          ctx.where = 'blob'; ctx.key = rowKey || (pfx + '[' + i + '][' + c + ']');
          const t = processString(cv[c], evc, enShort, ctx);
          if (t !== cv[c]) cv[c] = t;
        }
        continue;
      }
      if (cv && typeof cv === 'object') transformNode(ev, cv, ctx, pfx + '[' + i + ']', key, enShort);
      else if (typeof cv === 'string') cnNode[i] = processString(cv, typeof ev === 'string' ? ev : null, enShort, ctx);
    }
    return cnNode;
  }
  if (cnNode && typeof cnNode === 'object') {
    for (const k of Object.keys(cnNode)) {
      const cv = cnNode[k];
      const ev = (enNode && typeof enNode === 'object') ? enNode[k] : undefined;
      if (typeof cv === 'string') {
        if (SKIP_ALWAYS.test(k) || SKIP_VALUE_KEY.test(k)) continue;
        ctx.where = 'blob'; ctx.key = pfx + '.' + k;
        cnNode[k] = processString(cv, typeof ev === 'string' ? ev : null, enShort, ctx);
      } else if (cv && typeof cv === 'object') {
        transformNode(ev, cv, ctx, pfx + '.' + k, k, enShort);
      }
    }
    return cnNode;
  }
  return cnNode;
}

// ---------------------------------------------------------------- 主流程
function parseBlob(raw) {
  const clean = raw.replace(CTRL, '');
  const tail = (raw.match(CTRL) || []).join('');
  return { node: JSON.parse(clean), tail };
}

const PREBREAK = process.env.BREAK_PREBREAK || path.join(root, 'backup_prebreak');
const EXTRACTED = process.env.BREAK_EXTRACTED || path.join(root, 'extracted');
const OUT_BLOBS = process.env.BREAK_OUT_BLOBS || path.join(root, 'apply', 'blobs.json');
const OUT_SPEC = process.env.BREAK_OUT_SPEC || path.join(root, 'apply', 'exe_spec.json');
const OUT_MAP = process.env.BREAK_OUT_MAP || path.join(root, 'trans', 'literal_map.json');
const preBlobs = JSON.parse(fs.readFileSync(path.join(PREBREAK, 'blobs.json.bak'), 'utf8'));
const curBlobs = JSON.parse(fs.readFileSync(OUT_BLOBS, 'utf8'));
const spec = JSON.parse(fs.readFileSync(OUT_SPEC, 'utf8'));
const litPre = JSON.parse(fs.readFileSync(path.join(PREBREAK, 'literal_map.json.bak'), 'utf8'));
const litCur = JSON.parse(fs.readFileSync(OUT_MAP, 'utf8'));

const ctx = []; ctx.where = ''; ctx.key = '';
const newBlobs = {};
const blobStat = {};

for (const id of Object.keys(preBlobs)) {
  const enPath = path.join(EXTRACTED, 'blob_' + id + '.json');
  let enNode = null;
  if (fs.existsSync(enPath)) {
    try { enNode = parseBlob(fs.readFileSync(enPath, 'utf8')).node; } catch (e) { enNode = null; }
  }
  const pre = parseBlob(preBlobs[id]);
  const node = pre.node;
  const before = JSON.stringify(node);
  transformNode(enNode, node, ctx, '', '', EN_SHORT_BLOB);
  const after = JSON.stringify(node);
  const changed = before !== after;
  newBlobs[id] = after + pre.tail;
  blobStat[id] = { changed, lenBefore: preBlobs[id].length, lenAfter: newBlobs[id].length };
}

// exe 字面量
const newLit = {};
let litChanged = 0;
// 键集以 prebreak 为准（版本迁移后旧键自然消失）
for (const en of Object.keys(litPre)) {
  const cur = litCur[en];
  const pre = litPre[en];
  if (typeof pre !== 'string' || !CJK_RE.test(pre)) { newLit[en] = cur !== undefined ? cur : pre; continue; }
  // 固定高度电报纸条（键名命中 KEEP_RE）保持现有断行版式
  if (KEEP_RE.test(en)) { newLit[en] = cur !== undefined ? cur : pre; continue; }
  ctx.where = 'literal'; ctx.key = en;
  const t = processString(pre, en, EN_SHORT, ctx);
  newLit[en] = t;
  if (t !== cur) litChanged++;
}

log('=== blob 变化 ===');
for (const id of Object.keys(blobStat)) {
  const s = blobStat[id];
  log('  blob ' + id + ': ' + (s.changed ? 'CHANGED  ' + s.lenBefore + ' -> ' + s.lenAfter : 'same') +
              '  (changed lines: ' + ctx.filter(c => c.where === 'blob' + id).length + ')');
}
log('exe literals changed: ' + litChanged + ' / ' + Object.keys(newLit).length);

// ---------------------------------------------------------------- 复核报告
// (a) 固定高度电报纸条（KEEP_RE）：中文行比英文行宽 -> 会被裁切
{
  const wide = [];
  for (const id of Object.keys(preBlobs)) {
    const enPath = path.join(EXTRACTED, 'blob_' + id + '.json');
    if (!fs.existsSync(enPath)) continue;
    let enNode = null;
    try { enNode = parseBlob(fs.readFileSync(enPath, 'utf8')).node; } catch (e) { continue; }
    const pre = parseBlob(preBlobs[id]);
    (function walk(e, c, key) {
      if (Array.isArray(c)) {
        for (let i = 0; i < c.length; i++) {
          const cv = c[i], ev = Array.isArray(e) ? e[i] : undefined;
          if (Array.isArray(cv) && cv.length >= 2 && typeof cv[0] === 'string' && typeof cv[1] === 'string') {
            const enRowKey = (Array.isArray(ev) && typeof ev[0] === 'string') ? ev[0] : '';
            const sameKey = (ev && Array.isArray(ev) && ev[0] === cv[0]);
            const rowKey = sameKey ? enRowKey : '';
            if (rowKey && KEEP_RE.test(rowKey)) {
              for (let cc = 1; cc < cv.length; cc++) {
                if (typeof cv[cc] !== 'string') continue;
                const evc = (Array.isArray(ev) && typeof ev[cc] === 'string') ? ev[cc] : null;
                if (evc === null) continue;
                const cl = splitLines(cv[cc]), el = splitLines(evc);
                for (let i2 = 0; i2 < cl.length; i2++) {
                  const e2 = i2 < el.length ? el[i2] : null;
                  if (e2 === null) continue;
                  if (uOf(cl[i2]) > uOf(e2)) wide.push({ id, rowKey, cn: cl[i2], en: e2, cnU: uOf(cl[i2]), enU: uOf(e2) });
                }
              }
            }
            continue;
          }
          if (cv && typeof cv === 'object') walk(Array.isArray(ev) ? ev : undefined, cv, key);
        }
        return;
      }
      if (c && typeof c === 'object') {
        for (const k of Object.keys(c)) walk(e && typeof e === 'object' ? e[k] : undefined, c[k], k);
      }
    })(enNode, pre.node, '');
  }
  log('\n=== (a) 固定高度纸条中「中文比英文宽」的行: ' + wide.length + ' ===');
  for (const w of wide.slice(0, 25)) {
    log('  [' + w.id + '] ' + w.rowKey + '  cnU=' + w.cnU + ' enU=' + w.enU);
    log('     EN: ' + JSON.stringify(w.en));
    log('     CN: ' + JSON.stringify(w.cn));
  }
}

// (b) 列对齐（>=3 连续空格）的长行：拆行会破坏列对齐
{
  const cols = [];
  for (const id of Object.keys(preBlobs)) {
    const pre = parseBlob(preBlobs[id]);
    (function walk(n, key) {
      if (typeof n === 'string') {
        for (const L of splitLines(n)) {
          if (/(?: {3,})/.test(L) && uOf(L) > LIMIT) cols.push({ id, key, L, u: uOf(L) });
        }
        return;
      }
      if (Array.isArray(n)) { n.forEach((v, i) => walk(v, key + '[' + i + ']')); return; }
      if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], key + '.' + k);
    })(pre.node, '');
  }
  log('\n=== (b) 列对齐且较长的行: ' + cols.length + ' ===');
  for (const c of cols.slice(0, 25)) {
    log('  [' + c.id + '] ' + c.key + '  u=' + c.u + '  ' + JSON.stringify(c.L.length > 110 ? c.L.slice(0, 110) + '...' : c.L));
  }
}

// 规则 3（英文原行宽预算）命中的条目——人工复核用
const r3 = ctx.filter(c => c.en !== null && c.en !== undefined && uOf(c.out) > LIMIT);
log('\n=== 命中「英文原行宽」预算（不拆行）的条目: ' + r3.length + ' ===');
for (const c of r3.slice(0, Number(process.env.LIMIT_SHOW || 40))) {
  log('  [' + c.where + '] ' + c.key);
  log('     EN: ' + JSON.stringify(c.en.length > 100 ? c.en.slice(0, 100) + '...' : c.en) + '  enU=' + uOf(c.en));
  log('     CN: ' + JSON.stringify(c.out.length > 100 ? c.out.slice(0, 100) + '...' : c.out) + '  cnU=' + uOf(c.out));
}

if (REPORT_FILE) fs.writeFileSync(REPORT_FILE, LOG.join('\n'), 'utf8');
if (apply) {
  // 写回 blobs（保持键顺序与尾部控制字符）
  const outBlobs = {};
  for (const id of Object.keys(newBlobs)) outBlobs[id] = newBlobs[id];
  fs.writeFileSync(OUT_BLOBS, JSON.stringify(outBlobs, null, 1), 'utf8');

  // spec.blobs 同步
  spec.blobs = {};
  for (const id of Object.keys(newBlobs)) spec.blobs[id] = newBlobs[id];
  // spec.literals：按旧文本 → 新文本替换
  const map = new Map();
  for (const en of Object.keys(newLit)) {
    const old = litCur[en], nw = newLit[en];
    if (old !== nw) {
      if (map.has(old) && map.get(old) !== nw) console.error('  ! literal conflict', JSON.stringify(old));
      map.set(old, nw);
    }
  }
  let n = 0;
  for (const l of spec.literals || []) {
    if (map.has(l.text)) { l.text = map.get(l.text); n++; }
  }
  fs.writeFileSync(OUT_SPEC, JSON.stringify(spec, null, 1), 'utf8');
  fs.writeFileSync(OUT_MAP, JSON.stringify(newLit, null, 1), 'utf8');
  log('\nwritten: apply/blobs.json (' + Object.keys(outBlobs).length + ' blobs), apply/exe_spec.json (' + n + ' literals), trans/literal_map.json');
}




