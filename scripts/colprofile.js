// node scripts/colprofile.js <png> <x0> <y0> <w> <h> [threshold]
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

const [f, x0s, y0s, ws, hs, ths] = process.argv.slice(2);
const x0 = +x0s, y0 = +y0s, w = +ws, h = +hs;
const light = ths === 'L';
const th = light ? +(process.argv[7] || 150) : (ths ? +ths : 140);
const img = decodePng(fs.readFileSync(f));
const cols = [];
for (let x = x0; x < x0 + w; x++) {
  let dark = 0;
  for (let y = y0; y < y0 + h; y++) {
    const i = y * img.w * img.ch + x * img.ch;
    const lum = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11;
    if (light ? lum > th : lum < th) dark++;
  }
  cols.push(dark);
}
// 输出列条形
let out = '';
for (let i = 0; i < cols.length; i++) out += cols[i] ? (cols[i] > 3 ? '#' : '+') : '.';
console.log('x from ' + x0 + ' to ' + (x0 + w - 1));
console.log(out);
// 列出字块（连续有墨迹的列区间）
let runs = [], st = -1;
for (let i = 0; i <= cols.length; i++) {
  const on = i < cols.length && cols[i] > 0;
  if (on && st < 0) st = i;
  if (!on && st >= 0) { runs.push([x0 + st, x0 + i - 1]); st = -1; }
}
console.log('ink runs (screen px):');
console.log(runs.map(r => r[0] + '-' + r[1] + '(w' + (r[1] - r[0] + 1) + ')').join('  '));
const gaps = [];
for (let i = 1; i < runs.length; i++) gaps.push(runs[i][0] - runs[i - 1][1] - 1);
if (gaps.length) console.log('gaps: ' + gaps.join(','));
