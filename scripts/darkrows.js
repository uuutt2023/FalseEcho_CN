// darkrows.js —— 统计区域内的"暗像素"逐行分布（用于浅色纸面上的深色文字）
// 用法: node scripts/darkrows.js <png> <x0> <y0> <w> <h> [thr]
const fs = require('fs');
function decodePng(b) {
  let p = 8, w = 0, h = 0, ct = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p); const type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0;
  const raw = require('zlib').inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[rp++];
    const row = raw.subarray(rp, rp + stride); rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, bb = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = row[i];
      if (ft === 1) v += a; else if (ft === 2) v += bb; else if (ft === 3) v += (a + bb) >> 1;
      else if (ft === 4) { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc) ? bb : c; }
      cur[i] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}
const [file, x0s, y0s, ws, hs, thrArg] = process.argv.slice(2);
const x0 = +x0s, y0 = +y0s, ww = +ws, hh = +hs, thr = +(thrArg || 90);
const img = decodePng(fs.readFileSync(file));
console.log(`image ${img.w}x${img.h} ch=${img.ch}  region ${x0},${y0} ${ww}x${hh} thr=${thr}`);
const rows = [];
for (let y = 0; y < hh; y++) {
  let n = 0;
  for (let x = 0; x < ww; x++) {
    const o = ((y0 + y) * img.w + (x0 + x)) * img.ch;
    const lum = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2];
    if (lum < thr) n++;
  }
  rows.push(n);
}
let inBand = false, start = 0;
for (let y = 0; y <= rows.length; y++) {
  const on = y < rows.length && rows[y] > 0;
  if (on && !inBand) { inBand = true; start = y; }
  if (!on && inBand) {
    inBand = false;
    console.log(`band y=${y0 + start}..${y0 + y - 1}  h=${y - start}  (screen px)`);
  }
}
console.log('per-row:');
rows.forEach((n, y) => console.log(`  y=${(y0 + y)}  ${n}`));
