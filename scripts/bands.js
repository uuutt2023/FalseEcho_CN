// 全图墨迹行带分析：自动取众数色作背景
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
const hist = new Map();
for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
  const i = (y * img.w + x) * img.ch;
  const k = (img.data[i] >> 3) + ',' + (img.data[i + 1] >> 3) + ',' + (img.data[i + 2] >> 3);
  hist.set(k, (hist.get(k) || 0) + 1);
}
let best = null, bc = -1;
for (const [k, v] of hist) if (v > bc) { bc = v; best = k; }
const [br, bg, bb] = best.split(',').map(v => (Number(v) << 3) + 4);
function isInk(x, y) {
  const i = (y * img.w + x) * img.ch;
  return Math.abs(img.data[i] - br) + Math.abs(img.data[i + 1] - bg) + Math.abs(img.data[i + 2] - bb) >= 90;
}
const rows = [];
for (let y = 0; y < img.h; y++) { let n = 0; for (let x = 0; x < img.w; x++) if (isInk(x, y)) n++; rows.push(n); }
console.log(`${file} ${img.w}x${img.h} bg=(${br},${bg},${bb})`);
let s = -1;
for (let i = 0; i <= rows.length; i++) {
  const on = i < rows.length && rows[i] > 0;
  if (on && s < 0) s = i;
  if (!on && s >= 0) {
    const a = s, b = i - 1;
    // 该带内的列区间
    const cols = [];
    for (let x = 0; x < img.w; x++) { let n = 0; for (let y = a; y <= b; y++) if (isInk(x, y)) n++; cols.push(n); }
    let cs = -1, runs = [];
    for (let x = 0; x <= cols.length; x++) {
      const on2 = x < cols.length && cols[x] > 0;
      if (on2 && cs < 0) cs = x;
      if (!on2 && cs >= 0) { runs.push([cs, x - 1]); cs = -1; }
    }
    console.log(`  band y${a}..${b} h=${b - a + 1} runs=${runs.length} x${runs[0] ? runs[0][0] : '-'}..${runs.length ? runs[runs.length - 1][1] : '-'}`);
    s = -1;
  }
}
