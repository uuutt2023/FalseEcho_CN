// 回退：把「校验目标/密文」类译文从 trans/*.tsv 中移除（回退为英文原文）
const fs = require('fs');
const path = require('path');

const KEEP_EN = new Set([
  'msg_dec_0001',
  'msg_enc_0001',
  't_msg_0001',
  'day_02_txt_decoded_m01_01',
  'day_02_txt_decoded_m05_01',
  'day_02_txt_decoded_generic_01',
  'day_02_txt_decoded_generic_02',
  'day_02_txt_decoded_generic_03',
  'day_02_txt_decoded_generic_04',
]);

const transDir = 'E:/FalseEcho_CN/trans';
let removed = 0;
for (const f of fs.readdirSync(transDir).filter(x => x.endsWith('.tsv'))) {
  const p = path.join(transDir, f);
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const i = line.indexOf('\t');
    if (i > 0 && KEEP_EN.has(line.slice(0, i))) { removed++; continue; }
    out.push(line);
  }
  fs.writeFileSync(p, out.join('\n'), 'utf8');
}
console.log('已回退条目数: ' + removed);

// 统计 Endless 表构成
const endless = fs.readFileSync('E:/FalseEcho_CN/loc/Endless EN.tsv', 'utf8').split(/\r?\n/).filter(l => l.trim());
const groups = {};
for (const line of endless) {
  const i = line.indexOf('\t');
  if (i < 0) continue;
  const k = line.slice(0, i);
  let g = 'other';
  if (k.startsWith('day_99_txt_dia_endless_dialogue_sailors_npc_decode')) g = 'dia_sailor_decode';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_sailors_npc_encode')) g = 'dia_sailor_encode';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_sailors_npc_ver')) g = 'dia_sailor_ver';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_sailors_npc')) g = 'dia_sailor_other';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_officers_npc_decode')) g = 'dia_officer_decode';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_officers_npc_encode')) g = 'dia_officer_encode';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_officers_npc_ver')) g = 'dia_officer_ver';
  else if (k.startsWith('day_99_txt_dia_endless_dialogue_officers_npc')) g = 'dia_officer_other';
  else if (k.startsWith('day_99_txt_dia_endless')) g = 'dia_endless_other';
  else if (k.includes('cipher')) g = 'cipher';
  else if (k.includes('decoded')) g = 'decoded';
  else if (k.includes('encode')) g = 'encode';
  else if (k.includes('ver')) g = 'ver';
  else if (k.startsWith('day_99_txt_dia')) g = 'dia_other';
  groups[g] = (groups[g] || 0) + 1;
}
console.log('\nEndless 表共 ' + endless.length + ' 条，构成:');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) console.log('  ' + k + ': ' + v);
