// 逐行像素剖面：统计指定 x 区间内每行的非背景像素数，用于测量字高
const fs = require('fs');
const path = require('path');
const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();

const args = process.argv.slice(2);
if (args.length < 4) { console.log('usage: node profile.js <png> <x0> <x1> <y0> <y1>'); process.exit(1); }
const [file, x0, x1, y0, y1] = args;
const [X0, X1, Y0, Y1] = [x0, x1, y0, y1].map(Number);

const buf = fs.readFileSync(file);
// 极简 PNG 解码：仅支持 8-bit RGB/RGBA 非隔行
function decodePng(b) {
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p); const type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8) throw new Error('bit depth ' + bd);
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0;
  if (!ch) throw new Error('color type ' + ct);
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

const img = decodePng(buf);
console.log(`image ${img.w}x${img.h} ch=${img.ch}`);
function px(x, y) {
  const i = (y * img.w + x) * img.ch;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
// 背景取样本角落
const bg = px(X0 - 3, (Y0 + Y1) >> 1);
console.log('bg sample', bg);
for (let y = Y0; y <= Y1; y++) {
  let dark = 0, red = 0, blue = 0, other = 0;
  for (let x = X0; x <= X1; x++) {
    const [r, g, bl] = px(x, y);
    const d = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(bl - bg[2]);
    if (d < 60) continue;
    if (r > 120 && g < 110 && bl < 110) red++;
    else if (bl > 110 && r < 110 && g < 110) blue++;
    else if (r < 110 && g < 110 && bl < 110) dark++;
    else other++;
  }
  if (dark + red + blue + other > 0) console.log(`y=${y}  dark=${dark} red=${red} blue=${blue} other=${other}`);
}
