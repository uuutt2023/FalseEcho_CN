// 从图集提取字格并分析墨迹行分布
// 用法: node cellink.js <fontDir> <fontName> <chars>
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
const dir = process.argv[2], fontName = process.argv[3];
const chars = (process.argv[4] || '， 。 头部').split(' ').filter(Boolean);
const plan = JSON.parse(fs.readFileSync(`${dir}/fontplan.json`, 'utf8'));
const fo = plan.fonts.find(f => f.name === fontName);
if (!fo) { console.log('font not found'); process.exit(1); }
const page = decodePng(fs.readFileSync(plan.pages[fo.page]));
console.log(`font=${fontName} em=${fo.em} baseline=${fo.baseline} cellH=${fo.cellH}`);
for (const ch of chars) {
  const cp = ch.codePointAt(0);
  const g = [...(fo.cjk || []), ...(fo.latin || [])].find(x => x.c === cp);
  if (!g) { console.log(`  '${ch}' MISSING`); continue; }
  const rows = [];
  let top = 99, bot = -1, ink = 0;
  for (let yy = 0; yy < g.h; yy++) {
    let c = 0;
    for (let xx = 0; xx < g.w; xx++) {
      const sy = g.y + yy, sx = g.x + xx;
      if (sy < 0 || sy >= page.h || sx < 0 || sx >= page.w) continue;
      const i = (sy * page.w + sx) * page.ch;
      if (page.data[i + 3] > 0) c++;
    }
    rows.push(c); ink += c;
    if (c > 0) { if (yy < top) top = yy; if (yy > bot) bot = yy; }
  }
  console.log(`  '${ch}' U+${cp.toString(16).toUpperCase()} cell(${g.x},${g.y}) w=${g.w} h=${g.h} shift=${g.shift} off=${g.off}  inkRows=${top}..${bot} (h=${bot - top + 1}) total=${ink}`);
  console.log(`      rows: ${rows.map(r => String(r).padStart(2)).join(' ')}`);
}
