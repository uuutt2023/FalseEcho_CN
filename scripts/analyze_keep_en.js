// 分析：找出译文中属于「校验目标/密文」必须保留英文的键
const fs = require('fs');
const path = require('path');

const transDir = 'E:/FalseEcho_CN/trans';
const files = fs.readdirSync(transDir).filter(f => f.endsWith('.tsv'));

const KEEP_EN = [
  /^msg_dec_/, /^msg_enc_/, /^t_msg_/, /_cipher_/, /cipher$/, /^cipher/,
  /_decoded_/, /^day_99_txt_msg_encode_/, /^day_99_txt_message_generic_/,
];

const all = [];
for (const f of files) {
  const lines = fs.readFileSync(path.join(transDir, f), 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const i = line.indexOf('\t');
    if (i < 0) continue;
    all.push({ file: f, key: line.slice(0, i), val: line.slice(i + 1) });
  }
}

const bad = all.filter(r => KEEP_EN.some(re => re.test(r.key)));
console.log('总译文条目: ' + all.length);
console.log('需回退为英文的条目: ' + bad.length);
for (const b of bad) console.log('  ' + b.file + '  ' + b.key);

// 统计主表键的分类分布
const main = fs.readFileSync('E:/FalseEcho_CN/loc/Localization - EN.tsv', 'utf8').split(/\r?\n/);
const kinds = {};
for (const line of main) {
  if (!line.trim()) continue;
  const i = line.indexOf('\t');
  if (i < 0) continue;
  const k = line.slice(0, i);
  const m = k.match(/^(day_\d+|day99|gen|intro|txt|msg|t_|war|front)/);
  const kind = m ? m[1] : 'other';
  kinds[kind] = (kinds[kind] || 0) + 1;
}
console.log('\n主表键前缀分布:');
for (const [k, v] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log('  ' + k + ': ' + v);
