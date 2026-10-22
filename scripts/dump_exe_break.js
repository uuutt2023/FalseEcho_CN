// dump_exe_break.js —— 列出所有「中文比英文窄但仍需断行」的 exe 字面量，逐条人工判定
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
function uOf(s) { let u = 0; for (const ch of s) u += CJK_RE.test(ch) ? 1 : 0.5; return u; }
function splitLines(s) { return s.split(/\r\n|\n|\r/); }

const litPre = JSON.parse(fs.readFileSync(root + '/backup_prebreak/literal_map.json.bak', 'utf8'));
const litCur = JSON.parse(fs.readFileSync(root + '/trans/literal_map.json', 'utf8'));
const out = [];
for (const en of Object.keys(litCur)) {
  const cur = litCur[en], pre = litPre[en];
  if (typeof cur !== 'string' || !CJK_RE.test(cur)) continue;
  if (/(_message|_decoded|_msg_|_msg$|txt_verm_|msg_dec_|msg_enc_)/.test(en)) continue;
  const enL = splitLines(en), cnL = splitLines(pre !== undefined ? pre : cur);
  let need = false; const detail = [];
  for (let i = 0; i < cnL.length; i++) {
    const cnU = uOf(cnL[i]);
    const enU = i < enL.length ? uOf(enL[i]) : null;
    const fits16 = cnU <= 16;
    const fitsEN = enU !== null && cnU <= enU && enU <= 26;
    detail.push({ i, cnU, enU, fits16, fitsEN });
    if (!fits16 && !fitsEN) need = true;
  }
  if (need) {
    out.push({ en, enLines: enL.length, cnLines: cnL.length, detail,
               pre: (pre !== undefined ? pre : cur), cur });
  }
}
let buf = '需要断行的 exe 字面量: ' + out.length + '\n';
for (const o of out) {
  buf += '\n--- EN: ' + JSON.stringify(o.en.length > 160 ? o.en.slice(0, 160) + '...' : o.en) + '\n';
  buf += '    PRE: ' + JSON.stringify(o.pre.length > 160 ? o.pre.slice(0, 160) + '...' : o.pre) + '\n';
  buf += '    CUR: ' + JSON.stringify(o.cur.length > 160 ? o.cur.slice(0, 160) + '...' : o.cur) + '\n';
  for (const d of o.detail) buf += '    line' + d.i + ' cnU=' + d.cnU + ' enU=' + d.enU + ' fits16=' + d.fits16 + ' fitsEN=' + d.fitsEN + '\n';
}
fs.writeFileSync(root + '/out/exe_break_list.txt', buf, 'utf8');
console.log('wrote out/exe_break_list.txt : ' + out.length + ' literals');
