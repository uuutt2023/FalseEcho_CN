// ============================================================================
// make_payload.js —— 生成「分发用注入补丁」的载荷
//   payload/blobs.json        9 个烘焙文本块的简体中文明文（供 data.win 用）
//   payload/blobs_b64.json    9 个文本块的 base64(zlib) 负载（供 exe 字符串池用，
//                             与 exe_patch.js 的 buildBlobPayload 完全一致 → 产物字节一致）
//   payload/exe_literals.json 437 条 exe 字符串池字面量 {off, text}
//   payload/exe_blobslots.json 9 个文本块在原版 exe 内的槽位 {idx, off, slotLen}
//   payload/fontplan.json     字体计划
//   payload/atlas_*.png       CJK 字形图集
// ============================================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const outDir = path.join(root, 'patcher', 'payload');
fs.mkdirSync(outDir, { recursive: true });

// ---- 1. 文本块明文
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
fs.writeFileSync(path.join(outDir, 'blobs.json'), JSON.stringify(blobs), 'utf8');
console.log('blobs.json:', Object.keys(blobs).length, 'blocks');

// ---- 2. 文本块 base64 负载（与 exe_patch.js 完全一致）
function buildBlobPayload(plain) {
  for (let extra = 0; extra < 128; extra++) {
    const p = plain + (extra ? ' '.repeat(extra) : '');
    const z = zlib.deflateSync(Buffer.from(p, 'utf8'), { level: 9 });
    if (z.length % 3 === 0) return Buffer.from(z).toString('base64');
  }
  throw new Error('cannot build blob payload');
}
// 原版 exe 内的 base64 负载（用于定位槽位）：来自 extracted/strings.tsv
const tsv = fs.readFileSync(process.env.EXE_STRG_TSV || path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
const strg = new Map();
for (const line of tsv.split('\n')) {
  if (!line) continue;
  const i = line.indexOf('\t');
  const mm = /^\[(\d+)\]$/.exec(line.slice(0, i));
  if (mm) strg.set(+mm[1], line.slice(i + 1));
}
const exe = fs.readFileSync(process.env.ORIG_EXE || path.join(root, 'backup_original', 'False Echo.exe'));
const b64map = {}, slots = [];
for (const idxStr of Object.keys(blobs)) {
  const idx = +idxStr;
  const origB64 = (strg.get(idx) || '').trim();
  if (!origB64) { console.log('!! no original b64 for blob', idx); continue; }
  const hit = exe.indexOf(Buffer.from(origB64, 'latin1'));
  if (hit < 0) { console.log('!! original b64 for blob', idx, 'not found in exe'); continue; }
  const slotLen = exe.indexOf(0, hit) - hit;
  slots.push({ idx, off: hit, slotLen });
  b64map[idxStr] = buildBlobPayload(blobs[idxStr]);
  console.log('  blob', idx, 'slot @0x' + hit.toString(16), 'slotLen', slotLen, '-> b64', b64map[idxStr].length);
}
fs.writeFileSync(path.join(outDir, 'blobs_b64.json'), JSON.stringify(b64map), 'utf8');
fs.writeFileSync(path.join(outDir, 'exe_blobslots.json'), JSON.stringify(slots), 'utf8');
console.log('blobs_b64.json:', Object.keys(b64map).length, 'blocks');
console.log('exe_blobslots.json:', slots.length, 'slots');

// ---- 3. exe 字面量
const spec = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8'));
const lits = spec.literals.map(l => ({ off: l.off, text: l.text }));
fs.writeFileSync(path.join(outDir, 'exe_literals.json'), JSON.stringify(lits), 'utf8');
console.log('exe_literals.json:', lits.length, 'literals');

// ---- 4. 字体计划 + 图集
const plan = JSON.parse(fs.readFileSync(path.join(root, 'fontout_cn6', 'fontplan.json'), 'utf8'));
// 图集路径改成相对文件名，便于随补丁分发
const pages = plan.pages.map(p => path.basename(p));
const plan2 = Object.assign({}, plan, { pages });
fs.writeFileSync(path.join(outDir, 'fontplan.json'), JSON.stringify(plan2), 'utf8');
for (const p of plan.pages) {
  fs.copyFileSync(p, path.join(outDir, path.basename(p)));
}
console.log('fontplan.json +', pages.length, 'atlas pages');

// ---- 5. 汇总
let total = 0;
for (const f of fs.readdirSync(outDir)) total += fs.statSync(path.join(outDir, f)).size;
console.log('payload total:', (total / 1048576).toFixed(2), 'MB');

