// 区域分析：先按行找墨迹带，再在每条带内做列剖（输出连续墨迹区间的 x 范围）
// 用法: node region.js <png> <x0> <x1> <y0> <y1> [bgX] [bgY]
const fs = require('fs');

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

const args = process.argv.slice(2);
const [file, x0, x1, y0, y1, bgXA, bgYA] = args;
const [X0, X1, Y0, Y1] = [x0, x1, y0, y1].map(Number);
const img = decodePng(fs.readFileSync(file));
function px(x, y) { const i = (y * img.w + x) * img.ch; return [img.data[i], img.data[i + 1], img.data[i + 2]]; }

// 背景取指定点；未指定则取区域左侧一点（在 x0-6，若越界则用 x1+6）
let bgX = bgXA !== undefined ? Number(bgXA) : (X0 - 6); if (bgX < 0) bgX = X1 + 6;
let bgY = bgYA !== undefined ? Number(bgYA) : (Y0 - 4);
const bg = px(bgX, bgY);
function diff(x, y) {
  const [r, g, b] = px(x, y);
  return Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
}
console.log(`file=${file} region x${X0}..${X1} y${Y0}..${Y1} bg=${bg} bgX=${bgX}`);

// 行墨迹
const rows = [];
for (let y = Y0; y <= Y1; y++) {
  let n = 0;
  for (let x = X0; x <= X1; x++) if (diff(x, y) >= 90) n++;
  rows.push(n);
}
// 分带
let s = -1;
const bands = [];
for (let i = 0; i <= rows.length; i++) {
  const on = i < rows.length && rows[i] > 0;
  if (on && s < 0) s = i;
  if (!on && s >= 0) { bands.push([Y0 + s, Y0 + i - 1]); s = -1; }
}
for (const [a, b] of bands) {
  const cols = [];
  for (let x = X0; x <= X1; x++) {
    let n = 0;
    for (let y = a; y <= b; y++) if (diff(x, y) >= 90) n++;
    cols.push(n);
  }
  const runs = [];
  let cs = -1;
  for (let i = 0; i <= cols.length; i++) {
    const on = i < cols.length && cols[i] > 0;
    if (on && cs < 0) cs = i;
    if (!on && cs >= 0) { runs.push([X0 + cs, X0 + i - 1]); cs = -1; }
  }
  const lastRun = runs.length ? runs[runs.length - 1] : [0, 0];
  console.log(`\nBAND y${a}..${b} h=${b - a + 1} runs=${runs.length}`);
  console.log('  runs: ' + runs.map(r => `${r[0]}..${r[1]}(${r[1] - r[0] + 1})`).join(' '));
  console.log(`  first=${runs[0] ? runs[0].join('..') : '-'} last=${lastRun.join('..')} totalInk=${runs.reduce((t, r) => t + (r[1] - r[0] + 1), 0)}`);
}
