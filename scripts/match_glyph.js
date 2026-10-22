// match_glyph.js —— 从截图取一个渲染单元，与三张图集的所有字格做位图匹配
// 用法: node scripts/match_glyph.js <png> <x> <y> [w] [h]
const fs = require('fs');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';

function decodePng(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
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
      let v;
      if (ft === 0) v = row[i];
      else if (ft === 1) v = (row[i] + a) & 255;
      else if (ft === 2) v = (row[i] + bb) & 255;
      else if (ft === 3) v = (row[i] + ((a + bb) >> 1)) & 255;
      else { const p0 = a + bb - c, pa = Math.abs(p0 - a), pb = Math.abs(p0 - bb), pc = Math.abs(p0 - c);
        v = (row[i] + (pa <= pb && pa <= pc ? a : (pb <= pc ? bb : c))) & 255; }
      cur[i] = v;
    }
  }
  return { w, h, ch, data: out };
}
function lum(img, x, y) {
  const i = (y * img.w + x) * img.ch;
  if (img.ch >= 3) return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
  return img.data[i];
}

const shot = decodePng(process.argv[2]);
const sx = +process.argv[3], sy = +process.argv[4];
const cw = +(process.argv[5] || 10), chh = +(process.argv[6] || 14);
// 屏幕是 2 倍：取 2cw x 2chh 的区域，降采样 2 倍，阈值二值化（暗=字形）
const RX = cw * 2, RY = chh * 2;
const render = [];
for (let y = 0; y < chh; y++) {
  let row = '';
  for (let x = 0; x < cw; x++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const l = lum(shot, sx + x * 2 + dx, sy + y * 2 + dy);
      s += (l < 150) ? 1 : 0;
    }
    row += (s >= 2) ? '1' : '0';
  }
  render.push(row);
}
console.log('渲染位图 (暗=墨迹):');
render.forEach(r => console.log('  ' + r.replace(/0/g, '.').replace(/1/g, '#')));

const plan = JSON.parse(fs.readFileSync(root + '/fontout_cn6/fontplan.json', 'utf8'));
const atlases = [0, 1, 2].map(i => decodePng(root + '/fontout_cn6/atlas_' + i + '.png'));
const results = [];
for (const f of plan.fonts) {
  const at = atlases[f.page];
  for (const g of f.cjk) {
    const cell = [];
    for (let y = 0; y < chh; y++) {
      let row = '';
      for (let x = 0; x < cw; x++) {
        let s = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const l = lum(at, g.x + x * 2 + dx, g.y + y * 2 + dy);
          s += (l < 150) ? 1 : 0;
        }
        row += (s >= 2) ? '1' : '0';
      }
      cell.push(row);
    }
    let same = 0, tot = 0;
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) { tot++; if (cell[y][x] === render[y][x]) same++; }
    results.push({ ch: String.fromCodePoint(g.c), font: f.name, score: same / tot });
  }
}
results.sort((a, b) => b.score - a.score);
console.log('\n最匹配的图集字格:');
for (const r of results.slice(0, 12)) console.log('  ' + r.ch + '  U+' + r.ch.codePointAt(0).toString(16).toUpperCase() + '  ' + r.font + '  相似度 ' + (r.score * 100).toFixed(1) + '%');
