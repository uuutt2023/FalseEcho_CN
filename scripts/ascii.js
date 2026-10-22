// ASCII 墨迹图：把区域按亮度渲染成字符，便于精确目视字形边界
// 用法: node ascii.js <png> <x0> <y0> <w> <h> [step]
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

const [file, x0, y0, cw, chh, stepA] = process.argv.slice(2);
const step = Number(stepA || 1);
const X0 = Number(x0), Y0 = Number(y0), CW = Number(cw), CH = Number(chh);
const img = decodePng(fs.readFileSync(file));
function lum(x, y) { const i = (y * img.w + x) * img.ch; return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; }

let lo = 255, hi = 0;
const L = [];
for (let y = Y0; y < Y0 + CH; y++) { const row = []; for (let x = X0; x < X0 + CW; x++) { const v = lum(x, y); row.push(v); if (v < lo) lo = v; if (v > hi) hi = v; } L.push(row); }
const ramp = ' .:-=+*#%@';
console.log(`file=${file} x${X0}..${X0 + CW - 1} y${Y0}..${Y0 + CH - 1} lum ${lo.toFixed(0)}..${hi.toFixed(0)} step=${step}`);
let hdr = '     ';
for (let x = 0; x < CW; x += step) hdr += (String(X0 + x).slice(-3))[String(X0 + x).length - 1];
console.log(hdr);
for (let y = 0; y < CH; y++) {
  let s = String(Y0 + y).padStart(4) + ' ';
  for (let x = 0; x < CW; x += step) {
    const v = L[y][x];
    const t = (hi - v) / (hi - lo || 1);
    s += ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
  }
  console.log(s);
}
