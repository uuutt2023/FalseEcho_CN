// 切分 Endless 表为可翻译批次
const fs = require('fs');
const path = require('path');

const src = 'E:/FalseEcho_CN/loc/Endless EN.tsv';
const outDir = 'E:/FalseEcho_CN/trans/Endless';
fs.mkdirSync(outDir, { recursive: true });

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(l => l.length);

// 保留英文的键（密文 / 校验目标 / 编码方向明文）
const KEEP_EN = [
  /^day_99_txt_cipher_/,
  /^day_99_txt_decoded_/,
  /^day_99_txt_msg_encode_/,
  /^day_99_txt_message_generic_/,
];

const rows = [];
for (const line of lines) {
  const i = line.indexOf('\t');
  if (i < 0) continue;
  const key = line.slice(0, i);
  const val = line.slice(i + 1);
  if (KEEP_EN.some(re => re.test(key))) continue;
  rows.push({ key, val });
}

// 统计特殊字符
let withCRLF = 0, withTab = 0, withBrace = 0;
for (const r of rows) {
  if (r.val.includes('\\r\\n')) withCRLF++;
  if (r.val.includes('\t')) withTab++;
  if (/\{red\}|\{\/red\}/.test(r.val)) withBrace++;
}
console.log(`可翻译 ${rows.length} 条；含 \\r\\n 的 ${withCRLF} 条，含真实制表符 ${withTab} 条，含 {red} 标签 ${withBrace} 条`);

const BATCH = 8;
const per = Math.ceil(rows.length / BATCH);
for (let b = 0; b < BATCH; b++) {
  const chunk = rows.slice(b * per, (b + 1) * per);
  if (!chunk.length) continue;
  const body = chunk.map(r => r.key + '\t' + r.val).join('\n');
  const p = path.join(outDir, `in_${String(b + 1).padStart(2, '0')}.tsv`);
  fs.writeFileSync(p, body, 'utf8');
  console.log(`  ${path.basename(p)}: ${chunk.length} 条`);
}
console.log('总批次数: ' + BATCH);
