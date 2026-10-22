// verify_pool_intact.js —— 安全网：补丁后，池内所有「未被有意修改」的字符串必须逐字节不变
// 目的：捕获「原位替换越界清零邻串」这类破坏（此前 11 处静默把 locale/PLAYER/BACK/idle
//       等紧邻字符串变成了空串，导致整页 UI 空白）
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const ORIG_EXE = process.env.ORIG_EXE || path.join(root, 'backup_original', 'False Echo.exe');
const A = fs.readFileSync(ORIG_EXE);
const B = fs.readFileSync(process.argv[2] || 'E:/FalseEcho_CN/out/FalseEcho_cn.exe');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8'));

// 被有意修改的偏移集合
const patchedOff = new Set((spec.literals || []).map(l => l.off));
const patchedText = new Map((spec.literals || []).map(l => [l.off, l.text]));

// 搬迁到 .cndata 的 blob：旧槽位被清零，属于预期
const relocBlobOff = new Set();
{
  const lgRaw = fs.readFileSync(path.join(root, 'out', 'patch_log.txt'));
  const lg = (lgRaw[0] === 0xff && lgRaw[1] === 0xfe)
    ? lgRaw.toString('utf16le')          // BOM => UTF-16LE
    : lgRaw.toString('utf8');            // 否则按 UTF-8
  for (const m of lg.matchAll(/blob \d+ \([^)]*\) (?:RELOCATED|IN-PLACE)\s+fileOff=(0x[0-9a-f]+)/g)) {
    relocBlobOff.add(parseInt(m[1], 16));
  }
}
console.log(`已搬迁 blob 槽位: ${relocBlobOff.size}`);

const { items } = loadPool(ORIG_EXE);
console.log(`池内字符串条目: ${items.length}，其中有意修改: ${patchedOff.size}`);

let changed = 0, ok = 0, missing = 0;
const problems = [];
for (const it of items) {
  const off = it.off;
  const origBytes = A.slice(off, off + Buffer.byteLength(it.s, 'utf8'));
  if (patchedOff.has(off)) {
    // 期望：原位 => 等于新文本；搬迁 => 原串槽位被清零（长度 = 原串长度）
    const want = Buffer.from(patchedText.get(off), 'utf8');
    const got = B.slice(off, off + want.length);
    if (got.equals(want)) { ok++; continue; }
    const origLen = Buffer.byteLength(it.s, 'utf8');
    const slot = B.slice(off, off + origLen + 1);   // 原串 + 原 NUL
    if (slot.every(b => b === 0)) { ok++; continue; }   // 已搬迁到 .cndata，原槽清零
    changed++;
    problems.push({ off, s: it.s, why: '改写内容不符', got: got.toString('utf8') });
    continue;
  }
  // 未被修改：必须逐字节一致
  if (relocBlobOff.has(off)) {           // blob：搬迁则旧槽清零，原位改写则内容变化
    const origLen = Buffer.byteLength(it.s, 'utf8');
    if (B.slice(off, off + origLen + 1).every(b => b === 0)) { ok++; continue; }
    ok++;                                 // 原位改写：内容必然变化，由 verify_blobs.js 校验
    continue;
  }
  const got = B.slice(off, off + origBytes.length);
  if (!got.equals(origBytes)) {
    changed++;
    const a = origBytes.toString('utf8'), g = got.toString('utf8');
    problems.push({ off, s: it.s, why: '被意外改动', got: g });
  } else ok++;
}
console.log(`一致 ${ok} / 异常 ${changed}`);
if (problems.length) {
  console.log('\n=== 被意外改动的字符串 ===');
  for (const p of problems.slice(0, 60)) {
    console.log(`  @0x${p.off.toString(16)} "${p.s}"  ${p.why}${p.got !== undefined ? ' -> now=' + JSON.stringify(p.got) : ''}`);
  }
  if (problems.length > 60) console.log(`  ... 其余 ${problems.length - 60} 条`);
  fs.writeFileSync(path.join(root, 'trans', 'pool_damage.json'), JSON.stringify(problems, null, 1), 'utf8');
  console.log('\nPOOL DAMAGED');
  process.exit(1);
}
console.log('\nPOOL INTACT -- 所有未修改字符串逐字节一致');

