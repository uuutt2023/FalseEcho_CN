// 扫描指定行的颜色分段，找出游戏画布边界
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
const file = process.argv[2];
const img = decodePng(fs.readFileSync(file));
console.log(`${file} ${img.w}x${img.h} ch=${img.ch}`);
for (const y of (process.argv[3] || '400').split(',').map(Number)) {
  let prev = null, s = 0;
  const out = [];
  for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * img.ch;
    const k = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
    if (prev === null) { prev = k; s = x; }
    else if (k !== prev) { out.push(`${s}..${x - 1}:${prev}`); prev = k; s = x; }
  }
  out.push(`${s}..${img.w - 1}:${prev}`);
  console.log(`row ${y}: ` + out.slice(0, 40).join(' | '));
  if (out.length > 40) console.log(`        ... (${out.length} runs) tail: ` + out.slice(-8).join(' | '));
}
