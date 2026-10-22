// 行墨迹统计：统计区域内每行的"暗像素"数量，输出行带（连续有墨的行段）
// 用法: node inkrows.js <png> <x0> <y0> <w> <h> [threshold]
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
      else if (ft === 4) { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c); }
      cur[i] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}
const [, , file, sx, sy, sw, sh, thr] = process.argv;
const X = +sx, Y = +sy, W = +sw, H = +sh, T = thr ? +thr : 100;
const img = decodePng(fs.readFileSync(file));
function lum(x, y) {
  const i = (y * img.w + x) * img.ch;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
}
function mx(x, y) {
  const i = (y * img.w + x) * img.ch;
  return Math.max(img.data[i], img.data[i + 1], img.data[i + 2]);
}
const MODE = (process.argv[8] || 'lum');
const val = MODE === 'max' ? mx : lum;
console.log(`region x${X}..${X + W} y${Y}..${Y + H} thr=${T}`);
const counts = [];
for (let y = Y; y < Y + H; y++) {
  let c = 0;
  for (let x = X; x < X + W; x++) if (val(x, y) < T) c++;
  counts.push(c);
}
// 行带
let inBand = false, start = 0;
for (let i = 0; i < counts.length; i++) {
  const has = counts[i] > 0;
  if (has && !inBand) { inBand = true; start = i; }
  if (!has && inBand) {
    inBand = false;
    console.log(`  band y=${Y + start}..${Y + i - 1}  h=${i - start}`);
  }
}
if (inBand) console.log(`  band y=${Y + start}..${Y + counts.length - 1}  h=${counts.length - start}`);
console.log('  per-row:');
for (let i = 0; i < counts.length; i++) console.log(`    y=${Y + i}  ${'#'.repeat(Math.min(60, counts[i]))} ${counts[i]}`);
