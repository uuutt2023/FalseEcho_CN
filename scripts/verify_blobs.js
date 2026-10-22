// verify_blobs.js —— 严格校验 9 个烘焙块在 exe 中的最终形态
//   从记录偏移读到 NUL 为止 → base64 解码 → zlib 解压 → 与 spec 比对 → JSON 合法性
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const EXE = process.argv[2] || 'E:/SteamLibrary/steamapps/common/False Echo Demo/False Echo.exe';
const B = fs.readFileSync(EXE);
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const logRaw = fs.readFileSync(path.join(root, 'out', 'patch_log.txt'));
const log = (logRaw[0] === 0xff && logRaw[1] === 0xfe)
  ? logRaw.toString('utf16le')          // BOM => UTF-16LE
  : logRaw.toString('utf8');            // 否则按 UTF-8

let fails = 0;
for (const m of log.matchAll(/blob (\d+): payload ok at (0x[0-9a-f]+) \((\d+) b64 chars\)/g)) {
  const id = m[1], off = parseInt(m[2], 16), n = parseInt(m[3]);
  const nul = B.indexOf(0, off);
  const b64 = B.slice(off, nul).toString('latin1');
  const out = [];
  out.push(`blob ${id} @0x${off.toString(16)}  记录长度=${n}  实际到 NUL 长度=${b64.length}`);
  let raw = null, err = '';
  try { raw = zlib.inflateSync(Buffer.from(b64, 'base64')).toString('utf8'); }
  catch (e) { err = e.message; }
  if (raw === null) { out.push(`  !! 解压失败: ${err}`); fails++; }
  else {
    const spec = blobs[id];
    const trimmed = raw.replace(/[\s\u0000]+$/, '');
    const specTrim = spec.replace(/[\s\u0000]+$/, '');
    out.push(`  解压长度=${raw.length}  spec长度=${spec.length}  尾部空白差异=${raw.length - spec.length}`);
    if (trimmed === specTrim) out.push('  内容一致 OK（仅尾部空白差异）');
    else {
      let k = 0; while (k < Math.min(trimmed.length, specTrim.length) && trimmed[k] === specTrim[k]) k++;
      out.push(`  !! 内容不一致，首个差异位置 ${k}`);
      out.push(`     exe : ${JSON.stringify(trimmed.slice(Math.max(0, k - 50), k + 50))}`);
      out.push(`     spec: ${JSON.stringify(specTrim.slice(Math.max(0, k - 50), k + 50))}`);
      fails++;
    }
    // JSON 合法性
    try { JSON.parse(trimmed); out.push('  JSON 解析 OK'); }
    catch (e) { out.push(`  !! JSON 解析失败: ${e.message}`); fails++; }
    // 关键：尾部多余字节是否会导致解析失败
    const extra = raw.length - trimmed.length;
    if (extra > 0) out.push(`  尾部多余 ${extra} 字节 = ${JSON.stringify(raw.slice(trimmed.length))}`);
  }
  console.log(out.join('\n'));
}
console.log(fails === 0 ? '\nALL BLOBS OK' : `\n${fails} 处异常`);
