// 扫描所有本地化文本（blob 表 + exe 池），列出"单行过长"的中文字符串
// 条件：按 \r\n 切分后，最长一段的 CJK 字符数 > limit
// 用法: node scripts/find_long_lines.js [limit]
const fs = require('fs');
const limit = +(process.argv[2] || 16);

function cjkCount(s) {
  return (s.match(/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/g) || []).length;
}
function lineLen(s) {
  let mx = 0;
  for (const l of s.split(/\r\n|\n|\r/)) {
    const n = cjkCount(l);
    if (n > mx) mx = n;
  }
  return mx;
}

const rows = [];
// ---- blob 表 ----
const blobs = JSON.parse(fs.readFileSync('apply/blobs.json', 'utf8'));
const SKIP = /^(msg_dec_|msg_enc_|t_msg_|.*_cipher_.*|.*_decoded_.*|day_99_txt_msg_encode_|day_99_txt_msg_message_generic_|day_99_txt_msg_dec_)/;
for (const [idx, raw] of Object.entries(blobs)) {
  const clean = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '');
  let node;
  try { node = JSON.parse(clean); } catch (e) { continue; }
  (function walk(n, path) {
    if (typeof n === 'string') {
      const key = path.split('.').pop();
      if (SKIP.test(key)) return;
      const L = lineLen(n);
      if (L > limit) rows.push({ where: `blob${idx}${path}`, key, len: L, cn: n });
      return;
    }
    if (Array.isArray(n)) { n.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], `${path}.${k}`);
  })(node, '');
}
// ---- exe 池 ----
const spec = JSON.parse(fs.readFileSync('apply/exe_spec.json', 'utf8'));
for (const l of spec.literals || []) {
  if (SKIP.test(l.key || '')) continue;
  const L = lineLen(l.text || '');
  if (L > limit) rows.push({ where: `exe@${l.off}`, key: l.key || '', len: L, cn: l.text });
}
console.log(`最长行 > ${limit} CJK 字的条目: ${rows.length}\n`);
rows.sort((a, b) => b.len - a.len);
for (const r of rows) {
  const first = r.cn.split(/\r\n|\n|\r/)[0];
  console.log(`[${r.len}] ${r.where} ${r.key}`);
  console.log(`    ${JSON.stringify(r.cn.length > 120 ? r.cn.slice(0, 120) + '...' : r.cn)}`);
}
