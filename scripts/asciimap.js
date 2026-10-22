// asciimap.js —— 把 PNG 区域以字符图画出来（暗像素用 #）
// 用法: node scripts/asciimap.js <png> <x0> <y0> <w> <h> [thr]
const fs = require('fs');
const { execFileSync } = require('child_process');
const m = require('./darkrows_decode.js');

const [file, x0s, y0s, ws, hs, thrArg] = process.argv.slice(2);
const x0 = +x0s, y0 = +y0s, ww = +ws, hh = +hs, thr = +(thrArg || 90);
const img = m.decodePng(fs.readFileSync(file));
console.log(`image ${img.w}x${img.h} ch=${img.ch}`);
let out = '';
for (let y = 0; y < hh; y++) {
  let line = '';
  for (let x = 0; x < ww; x++) {
    const o = ((y0 + y) * img.w + (x0 + x)) * img.ch;
    const lum = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2];
    line += lum < thr ? '#' : (lum < thr + 50 ? '+' : '.');
  }
  out += (y0 + y).toString().padStart(4) + ' ' + line + '\n';
}
console.log(out);
