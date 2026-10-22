// verify_nul.js —— 校验 exe 中每一处替换后的字符串是否仍以 NUL 正确终止
// 风险：原位缩短/等长替换若未补 NUL，字符串会串到旧内容的残留字节上
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const EXE = 'E:/SteamLibrary/steamapps/common/False Echo Demo/False Echo.exe';
const B = fs.readFileSync(EXE);

const spec = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8'));

// --- 字面量：从 spec 的 off 找不到原文，需要用原 exe 的池反查 ---
// 直接做法：用原 exe 的字符串池（8 字节对齐，NUL 结尾）重建 offset->text
const A = fs.readFileSync(path.join(root, 'backup_original', 'False Echo.exe'));

// 收集所有「被改动的原位区域」：用 diff 找出，再判断该区域新内容是否 NUL 终止
// 更直接：对每个 literal 替换项，spec 里存的是新文本 + off
// 但 spec 的 off 是**新文件**里的偏移吗？先验证。
const lits = spec.literals;
console.log('spec literals: ' + lits.length);

// 1) 找出原 exe 中所有 NUL 结尾的字符串池条目（8 字节对齐）
//    池起始：0x2eaa2a0 附近（diff 显示 "Encoding" 在 0x2eaa2a0）
// 先定位池范围
function poolScan() {
  const map = new Map();
  let i = 0x2e00000;
  const end = 0x300e000;
  while (i < end) {
    // 找到一段可打印/UTF8 文本
    let j = i;
    let printable = 0;
    while (j < end) {
      const b = B[j];
      if (b === 0) break;
      j++;
    }
    const len = j - i;
    if (len >= 1 && len <= 600) {
      const s = B.slice(i, j).toString('utf8');
      // 合理性：可打印字符占比高
      let ok = 0;
      for (const ch of s) { const c = ch.codePointAt(0); if ((c >= 0x20 && c < 0x7f) || c > 0x2000) ok++; }
      if (ok / s.length > 0.9) {
        if (!map.has(s)) map.set(s, []);
        map.get(s).push(i);
      }
    }
    // 对齐到 8
    i = (Math.floor(j / 8) + 1) * 8;
  }
  return map;
}
const pool = poolScan();
console.log('池中唯一字符串: ' + pool.size);

// 2) 检查 spec 每个 literal：在新 exe 的对应位置，内容是否是新文本且后面紧跟 NUL
let bad = 0, ok = 0, unknown = 0;
for (const l of lits) {
  const off = l.off;
  const txt = l.text;
  const bytes = Buffer.from(txt, 'utf8');
  const at = B.slice(off, off + bytes.length);
  if (!at.equals(bytes)) { unknown++; if (unknown <= 8) console.log(`  ?? 偏移 0x${off.toString(16)} 内容与 spec 不符`); continue; }
  const after = B[off + bytes.length];
  if (after !== 0) {
    bad++;
    if (bad <= 15) {
      const ctx = B.slice(off + bytes.length, off + bytes.length + 24).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
      console.log(`  !! 未终止 @0x${off.toString(16)} "${txt}" 后续字节: ${ctx}`);
    }
  } else ok++;
}
console.log(`\n字面量: 正确 NUL 终止 ${ok} / 位置不符 ${unknown} / 未终止 ${bad}`);

// 3) 检查 9 个 blob：base64 解码后校验 + NUL
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const log = fs.readFileSync(path.join(root, 'out', 'patch_log.txt'), 'utf16le');
for (const m of log.matchAll(/blob (\d+): payload ok at (0x[0-9a-f]+) \((\d+) b64 chars\)/g)) {
  const id = m[1], off = parseInt(m[2], 16), n = parseInt(m[3]);
  const b64 = B.slice(off, off + n).toString('latin1');
  const after = B[off + n];
  let dec = null, okDec = false;
  try { dec = Buffer.from(b64, 'base64'); okDec = true; } catch (e) {}
  let contentOk = false;
  if (okDec) {
    try {
      const zlib = require('zlib');
      const raw = zlib.inflateSync(dec).toString('utf8');
      contentOk = raw === blobs[id];
    } catch (e) { contentOk = 'zlib-fail:' + e.message; }
  }
  console.log(`blob ${id} @0x${off.toString(16)} len=${n} 末尾字节=0x${after.toString(16)} ${after === 0 ? '(NUL OK)' : '*** 非 NUL ***'} 解码内容=${contentOk === true ? '与 spec 一致' : contentOk}`);
}
