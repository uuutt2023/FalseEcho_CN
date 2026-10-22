// 把 break_long.js 里嵌入的字面控制字符正则替换为转义写法
const fs = require('fs');
const p = 'E:/FalseEcho_CN/scripts/break_long.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;
s = s.replace(/const CTRL = \/\[[\s\S]*?\]\+\/g;/, 'const CTRL = /[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]+/g;');
fs.writeFileSync(p, s, 'utf8');
console.log('patched:', before !== s);
const i = s.indexOf('const CTRL');
console.log(JSON.stringify(s.slice(i, i + 70)));
