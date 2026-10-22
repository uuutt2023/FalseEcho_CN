// 列剖：在指定行带内，输出"墨迹"的列区间（用于测量一行文字的左右边界与字距）
// 用法: node cols.js <png> <x0> <x1> <y0> <y1> [mode] [thr]
//   mode = dark  -> 亮度 < thr 视为墨迹
//   mode = light -> 亮度 > thr 视为墨迹
const fs = require('fs'); const zlib = require('zlib');
function decodePng(b) {
  let p = 8, w = 0, h = 0, ct = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p); const t = b.toString('ascii', p + 4, p + 8);
    const d = b.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    p += 12 + len;
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[rp++]; const row = raw.subarray(rp, rp + stride); rp += stride;
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
const [, , file, sx, ex, sy, ey, mode, thr] = process.argv;
const X0 = +sx, X1 = +ex, Y0 = +sy, Y1 = +ey, T = thr ? +thr : 60;
const img = decodePng(fs.readFileSync(file));
const lum = (x, y) => { const i = (y * img.w + x) * img.ch; return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; };
const isInk = (x, y) => mode === 'light' ? lum(x, y) > T : lum(x, y) < T;
const col = [];
for (let x = X0; x < X1; x++) { let c = 0; for (let y = Y0; y < Y1; y++) if (isInk(x, y)) c++; col.push(c); }
let inRun = false, s = 0;
const runs = [];
for (let i = 0; i < col.length; i++) {
  const has = col[i] > 0;
  if (has && !inRun) { inRun = true; s = i; }
  if (!has && inRun) { inRun = false; runs.push([X0 + s, X0 + i - 1, i - s]); }
}
if (inRun) runs.push([X0 + s, X0 + col.length - 1, col.length - s]);
console.log(`x${X0}..${X1} y${Y0}..${Y1} mode=${mode} thr=${T}  runs=${runs.length}`);
for (const r of runs) console.log(`  ${r[0]}..${r[1]}  w=${r[2]}`);
if (runs.length > 1) {
  const gaps = [];
  for (let i = 1; i < runs.length; i++) gaps.push(runs[i][0] - runs[i - 1][1] - 1);
  console.log('  gaps:', gaps.join(','));
}
