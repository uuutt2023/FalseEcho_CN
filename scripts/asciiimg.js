// node scripts/asciiimg.js <png> <x0> <y0> <w> <h> [mode]
// mode: 'L' light-on-dark (default), 'D' dark-on-light
const fs = require('fs');
const zlib = require('zlib');

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
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0;
  const raw = zlib.inflateSync(Buffer.concat(idat));
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

const [f, x0s, y0s, ws, hs, mode] = process.argv.slice(2);
const x0 = +x0s, y0 = +y0s, w = +ws, h = +hs;
const img = decodePng(fs.readFileSync(f));
const RAMP = ' .:-=+*#%@';
console.log('    ' + Array.from({ length: w }, (_, i) => (i % 10 === 0 ? String(Math.floor((x0 + i) / 10) % 10) : ' ')).join(''));
for (let y = y0; y < y0 + h; y++) {
  let s = '';
  for (let x = x0; x < x0 + w; x++) {
    const i = y * img.w * img.ch + x * img.ch;
    const lum = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11;
    let v = mode === 'D' ? 255 - lum : lum;
    s += RAMP[Math.min(9, Math.floor(v / 25.6))];
  }
  console.log(String(y).padStart(3) + ' ' + s);
}
