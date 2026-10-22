// 对比每个字体：拉丁大写 A/H 的墨迹高与 advance，以及（若有）CJK 的墨迹宽高与 advance
const fs = require('fs');
const files = process.argv.slice(2);
for (const file of files) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`\n===== ${file} =====`);
  console.log('idx  font                 em  asc  lh  ao | A(w,adv) H(w,adv) x(w,adv) | CJK按(w,adv)');
  for (const f of j.fonts) {
    if (f.null) continue;
    const map = {};
    for (const g of (f.glyphs || [])) map[g.c] = g;
    const A = map[65], H = map[72], x = map[120], C = map[0x6309];
    const fm = (g) => g ? `${g.w}x${g.h}/adv${g.shift}` : '-';
    console.log(
      `${String(f.index).padStart(3)}  ${f.name.padEnd(20)} ${String(f.emSize).padStart(3)} ${String(f.ascender).padStart(4)} ${String(f.lineHeight).padStart(3)} ${String(f.ascenderOffset).padStart(3)} | ` +
      `${fm(A).padEnd(10)} ${fm(H).padEnd(10)} ${fm(x).padEnd(10)} | ${fm(C)}`
    );
  }
}
