// 把含真实 TAB 的 2 条从批次中移除（单独人工处理），并生成待译清单
const fs = require('fs');
const path = require('path');
const outDir = 'E:/FalseEcho_CN/trans/Endless';

const MANUAL = [
  'day_99_txt_dia_ver_intro_01',
  'day_99_txt_dia_endless_dialogue_sailors_npc_encode_exit_01_false_04',
];

const files = fs.readdirSync(outDir).filter(f => /^in_\d+\.tsv$/.test(f));
const manualLines = [];
for (const f of files) {
  const p = path.join(outDir, f);
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.length);
  const keep = [];
  for (const l of lines) {
    const i = l.indexOf('\t');
    const k = l.slice(0, i);
    if (MANUAL.includes(k)) { manualLines.push(l); continue; }
    keep.push(l);
  }
  fs.writeFileSync(p, keep.join('\n'), 'utf8');
}
fs.writeFileSync(path.join(outDir, 'manual.tsv'), manualLines.join('\n'), 'utf8');
console.log('已移出 ' + manualLines.length + ' 条到 manual.tsv');
