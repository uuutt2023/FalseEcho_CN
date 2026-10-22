// dump_pool_range.js —— 打印 exe 字符串池某区间的原始字符串
const fs = require('fs');
const root = 'E:/FalseEcho_CN';
const file = process.argv[2] || (root + '/backup_newbuild/False Echo.exe');
const from = parseInt(process.argv[3], 16);
const to = parseInt(process.argv[4], 16);
const b = fs.readFileSync(file);
const s = b.toString('latin1', from, to);
const parts = s.split('\0').filter(x => x.length > 0);
let out = '';
for (const p of parts) out += JSON.stringify(p.length > 120 ? p.slice(0, 120) + '...' : p) + '\n';
process.stdout.write(out);
