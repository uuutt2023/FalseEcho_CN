// 检查 blob 文本内的换行编码形式（\\r\\n 转义 vs 真实 CRLF）
const fs = require('fs');
const file = process.argv[2] || 'decoded/b2566.txt';
const s = fs.readFileSync(file, 'utf8');
const esc = (s.match(/\\r\\n/g) || []).length;
const real = (s.match(/\r\n/g) || []).length;
const escN = (s.match(/\\n/g) || []).length;
const realN = (s.match(/\n/g) || []).length;
console.log(`${file}: 转义 \\r\\n=${esc}  真实CRLF=${real}  转义\\n=${escN}  真实LF=${realN}`);
// 打印第一个含 \\r\\n 的字符串
const re = /"((?:[^"\\]|\\.)*?\\r\\n(?:[^"\\]|\\.)*?)"/;
const m = re.exec(s);
if (m) console.log('样例:', JSON.stringify(m[1].slice(0, 240)));
