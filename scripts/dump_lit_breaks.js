// ============================================================================
// dump_lit_breaks.js —— 检查 exe 字面量的断行情况
// ============================================================================
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g;
const CJK_RE = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/;
function uOf(s) { let u = 0; for (const ch of s) u += CJK_RE.test(ch) ? 1 : 0.5; return u; }
function splitLines(s) { return s.split(/\r\n|\n|\r/); }

const cur = JSON.parse(fs.readFileSync(root + '/trans/literal_map.json', 'utf8'));
const pre = JSON.parse(fs.readFileSync(root + '/backup_prebreak/literal_map.json.bak', 'utf8'));

let nN = 0, nPlain = 0;
const rowsN = [], rowsPlain = [];
for (const en of Object.keys(cur)) {
  const c = cur[en];
  if (typeof c !== 'string' || !CJK_RE.test(c)) continue;
  const enHasN = en.indexOf('\n') >= 0;
  const p = pre[en];
  const curLines = splitLines(c), preLines = splitLines(p === undefined ? c : p), enLines = splitLines(en);
  if (enHasN) {
    nN++;
    rowsN.push({ en, cur, pre: p, enLines: enLines.length, preLines: preLines.length, curLines: curLines.length });
  } else {
    nPlain++;
    const hasSpace = c.indexOf(' ') >= 0;
    rowsPlain.push({ en, cur, pre: p, changed: p !== undefined && p !== c, hasSpace, enU: uOf(en), curU: uOf(c) });
  }
}
console.log('exe literals with CN: EN-has-newline=' + nN + '  EN-plain=' + nPlain);
console.log('\n===== EN 含换行的字面量（保留 CRLF 的那批）=====');
for (const r of rowsN) {
  const same = r.curLines === r.preLines;
  console.log((same ? '  [同] ' : '  [多] ') + 'enLines=' + r.enLines + ' pre=' + r.preLines + ' cur=' + r.curLines);
  console.log('    EN : ' + JSON.stringify(r.en.length > 120 ? r.en.slice(0, 120) + '...' : r.en));
  console.log('    PRE: ' + JSON.stringify(r.pre && r.pre.length > 120 ? r.pre.slice(0, 120) + '...' : r.pre));
  console.log('    CUR: ' + JSON.stringify(r.cur.length > 120 ? r.cur.slice(0, 120) + '...' : r.cur));
}
console.log('\n===== EN 无换行的字面量（cn9 空格化的那批）=====');
let shown = 0;
for (const r of rowsPlain) {
  if (!r.changed) continue;
  if (shown++ >= Number(process.env.LIMIT || 30)) break;
  console.log('  enU=' + r.enU + ' cnU=' + r.curU);
  console.log('    EN : ' + JSON.stringify(r.en.length > 110 ? r.en.slice(0, 110) + '...' : r.en));
  console.log('    PRE: ' + JSON.stringify(r.pre && r.pre.length > 110 ? r.pre.slice(0, 110) + '...' : r.pre));
  console.log('    CUR: ' + JSON.stringify(r.cur.length > 110 ? r.cur.slice(0, 110) + '...' : r.cur));
}
