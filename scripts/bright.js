// 在指定行带内找出「亮色像素」（如蓝底白字）的列区间
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
const [file, x0, x1, y0, y1, thr] = process.argv.slice(2);
const [X0, X1, Y0, Y1] = [x0, x1, y0, y1].map(Number);
const T = thr ? Number(thr) : 200;
const img = decodePng(fs.readFileSync(file));
function bright(x, y) {
  const i = (y * img.w + x) * img.ch;
  return (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 >= T;
}
const cols = [];
for (let x = X0; x <= X1; x++) {
  let n = 0;
  for (let y = Y0; y <= Y1; y++) if (bright(x, y)) n++;
  cols.push(n);
}
let s = -1;
const runs = [];
for (let i = 0; i <= cols.length; i++) {
  const on = i < cols.length && cols[i] > 0;
  if (on && s < 0) s = i;
  if (!on && s >= 0) { runs.push([X0 + s, X0 + i - 1]); s = -1; }
}
console.log(`${file} 亮像素(>=${T}) x${X0}..${X1} y${Y0}..${Y1}`);
console.log('  runs: ' + runs.map(r => `${r[0]}..${r[1]}(${r[1] - r[0] + 1})`).join(' '));
console.log(`  跨度 ${runs.length ? runs[0][0] : '-'}..${runs.length ? runs[runs.length - 1][1] : '-'} = ${runs.length ? runs[runs.length - 1][1] - runs[0][0] + 1 : 0} px`);
// 行带（亮像素的行分布）
for (let y = Y0; y <= Y1; y++) {
  let n = 0;
  for (let x = X0; x <= X1; x++) if (bright(x, y)) n++;
  if (n) console.log(`   row ${y}: ${n}`);
}
