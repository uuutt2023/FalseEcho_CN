// check_overrun.js —— 检查原位替换的清零范围是否越界覆盖了紧随其后的字符串
// 字符串池是**紧密排列**的：NUL 之后可能只隔 1~3 个 0 就是下一个字符串。
// 补丁器用 align(len,8) 作为 slot，并 fill(0, off, off+slot) —— 会吃掉邻居。
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const A = fs.readFileSync(path.join(root, 'backup_original', 'False Echo.exe'));
const spec = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8'));
const align = (v, a) => Math.ceil(v / a) * a;

// 下一个非 NUL 内容的起点
function nextContentStart(buf, from) {
  let i = from;
  while (i < buf.length && buf[i] === 0) i++;
  return i;
}

let bad = 0, ok = 0;
const badList = [];
for (const l of spec.literals || []) {
  const off = l.off;
  const nul = A.indexOf(0, off);
  if (nul < 0) continue;
  const len = nul - off;
  const orig = A.slice(off, nul).toString('utf8');
  const slot = align(len, 8);
  const nxt = nextContentStart(A, nul + 1);
  const overrun = off + slot > nxt;
  if (overrun) {
    bad++;
    const clobbered = A.slice(nxt, nxt + (off + slot - nxt)).toString('utf8');
    badList.push({ off, orig, len, slot, nxt, clobbered, newText: l.text, newLen: Buffer.byteLength(l.text, 'utf8') });
  } else ok++;
}
console.log(`字面量: 安全 ${ok} / 越界 ${bad}`);
for (const b of badList) {
  console.log(`\n!! @0x${b.off.toString(16)} 原串="${b.orig}" (len=${b.len}) slot=${b.slot}`);
  console.log(`   下一个字符串起点=0x${b.nxt.toString(16)}  被清零的字节="${b.clobbered}" (${Buffer.byteLength(b.clobbered,'utf8')} 字节)`);
  console.log(`   新文本="${b.newText}" (${b.newLen} 字节)  实际需要 ${b.newLen + 1} 字节，原串实际可用 ${b.len + 1} 字节`);
}
fs.writeFileSync(path.join(root, 'trans', 'overrun_literals.json'), JSON.stringify(badList, null, 2), 'utf8');
