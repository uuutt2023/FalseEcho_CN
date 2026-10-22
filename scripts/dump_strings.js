const fs = require('fs');
const A = fs.readFileSync('E:/FalseEcho_CN/backup_original/False Echo.exe');
const start = parseInt(process.argv[2], 16);
const len = parseInt(process.argv[3] || '768', 10);
// 打印区间内的 NUL 分隔字符串
let i = start;
while (i < start + len) {
  const e = A.indexOf(0, i);
  if (e < 0 || e > start + len) break;
  const s = A.slice(i, e).toString('utf8');
  if (s.length) console.log(`  0x${i.toString(16)}: ${JSON.stringify(s)}`);
  i = e + 1;
  // 跳过 NUL 填充
  while (i < start + len && A[i] === 0) i++;
}
