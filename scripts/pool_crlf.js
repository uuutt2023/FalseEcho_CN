// 在 exe 的字符串池中查找真实 CRLF，确认池内换行约定
const fs = require('fs');
const b = fs.readFileSync(process.argv[2] || 'backup_original/False Echo.exe');
let n = 0, shown = 0;
for (let i = 0; i < b.length - 1; i++) {
  if (b[i] === 0x0d && b[i + 1] === 0x0a) {
    n++;
    if (shown < 6) {
      shown++;
      // 找该处所属的 NUL 结尾字符串
      let st = i; while (st > 0 && b[st - 1] !== 0) st--;
      let en = i; while (en < b.length && b[en] !== 0) en++;
      const s = b.subarray(st, en).toString('latin1');
      if (s.length > 4 && /^[\x20-\x7e\r\n\t]*$/.test(s)) {
        console.log(`@0x${i.toString(16)} poolStr="${JSON.stringify(s.slice(0, 200))}"`);
      } else {
        console.log(`@0x${i.toString(16)} (非可打印串) 上下文=${JSON.stringify(b.subarray(i - 30, i + 30).toString('latin1'))}`);
      }
    }
  }
}
console.log(`\nCRLF 总数: ${n}`);
