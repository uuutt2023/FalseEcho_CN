// ============================================================================
// exe_patch.js -- patch player-facing text inside False Echo.exe (YYC build).
//
// Two placement strategies:
//   [IN-PLACE]  the new payload is <= the original 8-byte-aligned pool slot,
//               so we overwrite it in place and zero-pad the remainder.
//   [RELOCATE]  the new payload is larger (Chinese compresses worse than
//               English), so we append it to a brand-new PE section ".cndata"
//               and repoint the single RIP-relative reference in .text.
//
// The relocation is safe because:
//   * the string pool is referenced ONLY through RIP-relative disp32,
//   * there is exactly one such reference per pool string,
//   * the section table has 40 spare bytes at 0x380 (SizeOfHeaders 0x400),
//   * the file has no trailing slack, so the new section is appended at EOF.
//
// Usage:
//   node exe_patch.js --in <src> --out <dst> --spec <spec.json> [--verify]
// ============================================================================
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const root = 'E:\\FalseEcho_CN';

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
}
const inPath = arg('--in');
const outPath = arg('--out');
const specPath = arg('--spec');
const doVerify = argv.includes('--verify');
if (!inPath || !outPath || !specPath) {
  console.error('usage: node exe_patch.js --in src.exe --out dst.exe --spec spec.json [--verify]');
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

const src = fs.readFileSync(inPath);
const out = Buffer.from(src);           // working copy (same length as src)
let grown = null;                       // appended bytes for the new section

// ---------------------------------------------------------------- PE
const peOff = src.readUInt32LE(0x3C);
const optSize = src.readUInt16LE(peOff + 20);
const numSections = src.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const sectionAlignment = src.readUInt32LE(peOff + 24 + 32);
const fileAlignment = src.readUInt32LE(peOff + 24 + 60);
const optHdr = peOff + 24;
const imageBase = src.readBigUInt64LE(peOff + 24 + 24);

function readSections(buf) {
  const n = buf.readUInt16LE(peOff + 6);
  const so = peOff + 24 + buf.readUInt16LE(peOff + 20);
  const a = [];
  for (let i = 0; i < n; i++) {
    const o = so + i * 40;
    a.push({
      i, hdrOff: o,
      name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''),
      vsize: buf.readUInt32LE(o + 8), vaddr: buf.readUInt32LE(o + 12),
      rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20),
    });
  }
  return a;
}
let secs = readSections(src);
function toRva(fo, s) {
  for (const x of s || secs) if (fo >= x.rawptr && fo < x.rawptr + x.rawsize) return x.vaddr + (fo - x.rawptr);
  return null;
}
const align = (v, a) => Math.ceil(v / a) * a;

// ---------------------------------------------------------------- new section
const lastSec = secs[secs.length - 1];
const NEW_SEC_NAME = '.cndata';
const newSec = {
  vaddr: align(lastSec.vaddr + lastSec.vsize, sectionAlignment),
  rawptr: align(src.length, fileAlignment),
  hdrOff: secOff + numSections * 40,
};
newSec.vsize = 0;                                   // filled in at the end
newSec.rawsize = 0;
let secData = Buffer.alloc(0);                      // payload of the new section
let secCursor = 0;

function allocInNewSection(bytes) {
  // 8-byte align, like the original pool
  secCursor = align(secCursor, 8);
  const off = secCursor;
  secData = Buffer.concat([secData, Buffer.alloc(off - secData.length)]);
  secData = Buffer.concat([secData, bytes]);
  secCursor += bytes.length;
  return off;                                        // offset inside the new section
}

// ---------------------------------------------------------------- RIP refs
// Find every disp32 in .text that resolves (RIP-relative) to the given RVA.
//
// IMPORTANT: a raw 4-byte scan produces false positives -- a plain
// `mov rax,[rbp+disp32]` or an immediate that happens to point at the target
// would also "resolve".  A genuine x64 RIP-relative memory operand always has
// its ModRM byte IMMEDIATELY before the disp32, with mod=00 and r/m=101
// (i.e. ModRM & 0xC7 == 0x05).  We require that, so we never rewrite an
// unrelated instruction.
function isRipDisp(buf, q) {
  if (q < 1) return false;
  const modrm = buf[q - 1];
  return (modrm & 0xC7) === 0x05;
}
function findRipRefs(rva, buf) {
  const b = buf || src;
  const hits = [];
  for (const s of secs) {
    if (s.name !== '.text') continue;
    for (let q = s.rawptr; q < s.rawptr + s.rawsize - 4; q++) {
      if (!isRipDisp(b, q)) continue;
      const disp = b.readInt32LE(q);
      const next = toRva(q + 4, secs);
      if (next === null) continue;
      if (next + disp === rva) hits.push(q);
    }
  }
  return hits;
}
// Absolute 64-bit pointers (ImageBase+rva) anywhere in the file would also
// reference the string -- those must not be broken by a relocation.
function findAbsolutePtrs(rva) {
  const hits = [];
  const needle = Buffer.alloc(8);
  needle.writeBigUInt64LE(imageBase + BigInt(rva));
  let p = 0;
  while ((p = src.indexOf(needle, p)) >= 0) { hits.push(p); p += 8; }
  return hits;
}

// ---------------------------------------------------------------- report
const report = [];
function log(s) { console.log(s); report.push(s); }

// ---------------------------------------------------------------- original blob bytes
function strgTable() {
  const raw = fs.readFileSync(process.env.EXE_STRG_TSV || path.join(root, 'extracted', 'strings.tsv'), 'utf8').replace(/^\uFEFF/, '');
  const m = new Map();
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const i = line.indexOf('\t');
    const mm = /^\[(\d+)\]$/.exec(line.slice(0, i));
    if (mm) m.set(+mm[1], line.slice(i + 1));
  }
  return m;
}
const strg = strgTable();
function findAll(hay, needle) {
  const hits = []; let p = 0;
  while ((p = hay.indexOf(needle, p)) >= 0) { hits.push(p); p++; }
  return hits;
}

// ================================================================ BLOBS
const BLOB_NAMES = { 2575: 'Endless', 2576: 'Rules', 2577: 'FrontlineNews', 2578: 'Localization', 2579: 'WarDiary' };

function buildBlobPayload(plain) {
  // Tune trailing spaces so the compressed length is a multiple of 3 -> no
  // '=' padding in base64 (the game ships base64 without padding).
  for (let extra = 0; extra < 128; extra++) {
    const p = plain + (extra ? ' '.repeat(extra) : '');
    const z = zlib.deflateSync(Buffer.from(p, 'utf8'), { level: 9 });
    if (z.length % 3 === 0) return { z, b64: Buffer.from(z).toString('base64') };
  }
  return null;
}

const pendingReloc = [];   // {oldRva, newSecOff, label}

for (const [idxStr, plain] of Object.entries(spec.blobs || {})) {
  const idx = +idxStr;
  const origB64 = (strg.get(idx) || '').trim();
  const hits = findAll(src, origB64);
  if (!hits.length) { log(`!! blob ${idx} (${BLOB_NAMES[idx]}): original payload not found`); continue; }
  const payload = buildBlobPayload(plain);
  if (!payload) { log(`!! blob ${idx}: cannot build payload`); continue; }
  for (const h of hits) {
    const slotLen = src.indexOf(0, h) - h;     // 原 base64 长度（不含终止 NUL）
    const oldRva = toRva(h);
    if (payload.b64.length + 1 <= slotLen + 1) {
      // ---- in place：只写新 base64 + NUL，清理范围严格限制在原串内部
      out.write(payload.b64, h, 'latin1');
      out[h + payload.b64.length] = 0;
      if (payload.b64.length + 1 < slotLen + 1) out.fill(0, h + payload.b64.length + 1, h + slotLen);
      log(`blob ${idx} (${BLOB_NAMES[idx]}) IN-PLACE  fileOff=0x${h.toString(16)} avail=${slotLen + 1} new=${payload.b64.length}`);
    } else {
      // ---- relocate
      const refs = findRipRefs(oldRva);
      const abs = findAbsolutePtrs(oldRva);
      if (refs.length === 0) {
        log(`!! blob ${idx} (${BLOB_NAMES[idx]}): no RIP reference at 0x${h.toString(16)} -- skipped (left as is)`);
        continue;
      }
      if (abs.length) {
        log(`!! blob ${idx}: ${abs.length} absolute pointer(s) reference 0x${h.toString(16)} -- relocation unsafe, skipped`);
        continue;
      }
      const bytes = Buffer.from(payload.b64, 'latin1');
      const secOffIn = allocInNewSection(Buffer.concat([bytes, Buffer.from([0])]));
      const newRva = newSec.vaddr + secOffIn;
      pendingReloc.push({ oldRva, newRva, label: `blob${idx}` });
      // blank the old slot so no stale English payload lingers
      out.fill(0, h, h + slotLen);
      log(`blob ${idx} (${BLOB_NAMES[idx]}) RELOCATED fileOff=0x${h.toString(16)} slot=${slotLen} new=${payload.b64.length} -> newSec+0x${secOffIn.toString(16)} rva=0x${newRva.toString(16)} (refs=${refs.length})`);
    }
  }
}

// ================================================================ LITERALS
// spec.literals: [{ off: <file offset of the pool string>, text: <new text> }]
//
// CRITICAL: the exe string pool is TIGHTLY packed -- the next string may start
// only 1..3 bytes after this one's NUL.  The old code used
// slot = align(len, 8) and did fill(0, off, off+slot), which wiped the first
// bytes of the FOLLOWING string (11 cases: "locale", "PLAYER", "BACK",
// "idle", "text", "game", "BLUE", "NONE", "CPTN", "staple", "bm_one" all
// became empty strings and broke whole UI pages).
// The only bytes we may touch are the original string itself: [off, off+len]
// (len chars + its NUL).  Anything longer must be relocated.
for (const item of spec.literals || []) {
  const off = item.off;
  const oldRva = toRva(off);
  if (oldRva === null) { log(`!! literal @0x${off.toString(16)}: not inside a section`); continue; }
  const nul = src.indexOf(0, off);
  if (nul < 0) { log(`!! literal @0x${off.toString(16)}: no NUL`); continue; }
  const len = nul - off;               // 原文长度（不含终止 NUL）
  const avail = len + 1;               // 可用字节：文本 + 终止 NUL
  const newBytes = Buffer.from(item.text, 'utf8');
  if (newBytes.length + 1 <= avail) {
    // 原位：只写新文本 + NUL，清理范围严格限制在原串内部
    out.write(item.text, off, 'utf8');
    out[off + newBytes.length] = 0;
    if (newBytes.length + 1 < avail) out.fill(0, off + newBytes.length + 1, off + len);
    log(`literal @0x${off.toString(16)} IN-PLACE  avail=${avail} new=${newBytes.length}`);
  } else {
    const refs = findRipRefs(oldRva);
    const abs = findAbsolutePtrs(oldRva);
    if (refs.length === 0) {
      log(`!! literal @0x${off.toString(16)} (${JSON.stringify(item.text.slice(0, 30))}): no RIP reference -- skipped (left as is)`);
      continue;
    }
    if (abs.length) {
      log(`!! literal @0x${off.toString(16)}: ${abs.length} absolute pointer(s) reference it -- relocation unsafe, skipped`);
      continue;
    }
    const secOffIn = allocInNewSection(Buffer.concat([newBytes, Buffer.from([0])]));
    const newRva = newSec.vaddr + secOffIn;
    pendingReloc.push({ oldRva, newRva, label: `lit@0x${off.toString(16)}` });
    out.fill(0, off, off + avail);     // 只清原串 + 原 NUL，不越界到邻串
    log(`literal @0x${off.toString(16)} RELOCATED avail=${avail} new=${newBytes.length} -> newSec+0x${secOffIn.toString(16)} (refs=${refs.length})`);
  }
}

// ================================================================ emit new section
let finalBuf = out;
if (secData.length > 0) {
  const rawSize = align(secData.length, fileAlignment);
  const payload = Buffer.alloc(rawSize);
  secData.copy(payload, 0);
  finalBuf = Buffer.concat([out, payload]);

  // section header at 0x380
  const h = newSec.hdrOff;
  finalBuf.write(NEW_SEC_NAME.padEnd(8, '\0'), h, 'latin1');
  finalBuf.writeUInt32LE(secData.length, h + 8);            // VirtualSize
  finalBuf.writeUInt32LE(newSec.vaddr, h + 12);              // VirtualAddress
  finalBuf.writeUInt32LE(rawSize, h + 16);                   // SizeOfRawData
  finalBuf.writeUInt32LE(newSec.rawptr, h + 20);             // PointerToRawData
  finalBuf.writeUInt32LE(0, h + 24);                         // PointerToRelocations
  finalBuf.writeUInt32LE(0, h + 28);                         // PointerToLinenumbers
  finalBuf.writeUInt16LE(0, h + 32);                         // NumberOfRelocations
  finalBuf.writeUInt16LE(0, h + 34);                         // NumberOfLinenumbers
  finalBuf.writeUInt32LE(0x40000040, h + 36);                // Characteristics: read|init data

  // COFF header
  finalBuf.writeUInt16LE(numSections + 1, peOff + 6);
  // Optional header
  finalBuf.writeUInt32LE(align(newSec.vaddr + secData.length, sectionAlignment), optHdr + 56); // SizeOfImage
  finalBuf.writeUInt32LE(finalBuf.readUInt32LE(optHdr + 8) + rawSize, optHdr + 8);            // SizeOfInitializedData
  log(`\nnew section "${NEW_SEC_NAME}" vaddr=0x${newSec.vaddr.toString(16)} rawptr=0x${newSec.rawptr.toString(16)} rawsize=0x${rawSize.toString(16)} payload=${secData.length}`);
}

// ================================================================ patch RIP refs
for (const r of pendingReloc) {
  const refs = findRipRefs(r.oldRva);
  if (refs.length === 0) { log(`!! ${r.label}: no RIP reference to 0x${r.oldRva.toString(16)}`); bad++; continue; }
  if (refs.length > 1) log(`  note: ${r.label} has ${refs.length} RIP references`);
  for (const q of refs) {
    const nextRva = toRva(q + 4, secs);
    const newDisp = r.newRva - nextRva;
    if (newDisp < -2147483648 || newDisp > 2147483647) { log(`!! ${r.label}: disp out of range`); continue; }
    finalBuf.writeInt32LE(newDisp, q);
    log(`  patched RIP disp32 @0x${q.toString(16)}: 0x${(src.readInt32LE(q) >>> 0).toString(16)} -> 0x${(newDisp >>> 0).toString(16)}  (${r.label})`);
  }
}

fs.writeFileSync(outPath, finalBuf);
log(`\nwritten -> ${outPath} (${finalBuf.length} bytes, was ${src.length})`);

// 构建日志落盘（verify_blobs.js / verify_pool_intact.js 依赖）
try {
  fs.writeFileSync(path.join(root, 'out', 'patch_log.txt'), '﻿' + report.join('\r\n'), 'utf8');
  log('patch_log.txt 已更新');
} catch (e) { log('patch_log 写入失败: ' + e.message); }

// ================================================================ verify
if (doVerify) {
  console.log('\n=== VERIFY ===');
  const chk = fs.readFileSync(outPath);
  let bad = 0;
  // every pending relocation must resolve
  for (const r of pendingReloc) {
    const refs = findRipRefs(r.oldRva, chk);
    if (refs.length) { console.log(`  stale ref for ${r.label}`); bad++; }
    // find the new reference: a disp32 in .text resolving to r.newRva
    const found = findRipRefs(r.newRva, chk).length;
    if (!found) { console.log(`  NO ref points at new location of ${r.label}`); bad++; }
    else console.log(`  ${r.label}: ${found} ref(s) repointed to 0x${r.newRva.toString(16)}`);
  }
  // blobs must round-trip
  for (const [idxStr, plain] of Object.entries(spec.blobs || {})) {
    const idx = +idxStr;
    const origB64 = (strg.get(idx) || '').trim();
    const hits = findAll(chk, origB64);
    if (hits.length) { console.log(`  blob ${idx}: original English payload still present`); }
    // find our payload
    const p = buildBlobPayload(plain);
    const ph = findAll(chk, p.b64);
    if (!ph.length) { console.log(`  blob ${idx}: new payload not found in output`); bad++; continue; }
    for (const h of ph) {
      const len = p.b64.length;
      let dec;
      try { dec = zlib.inflateSync(Buffer.from(chk.toString('latin1', h, h + len), 'base64')).toString('utf8'); }
      catch (e) { dec = '<<inflate failed>>'; }
      if (dec.trim() !== plain.trim()) { console.log(`  blob ${idx}: payload mismatch at 0x${h.toString(16)}`); bad++; }
      else console.log(`  blob ${idx}: payload ok at 0x${h.toString(16)} (${len} b64 chars)`);
    }
  }
  // literal check
  for (const item of spec.literals || []) {
    const want = Buffer.from(item.text, 'utf8');
    const found = chk.indexOf(want);
    if (found < 0) { console.log(`  literal @0x${item.off.toString(16)}: text not present`); bad++; }
  }
  // PE sanity
  const n2 = chk.readUInt16LE(peOff + 6);
  const so2 = peOff + 24 + chk.readUInt16LE(peOff + 20);
  console.log(`  sections=${n2} SizeOfImage=0x${chk.readUInt32LE(optHdr + 56).toString(16)} fileSize=${chk.length}`);
  for (let i = 0; i < n2; i++) {
    const o = so2 + i * 40;
    console.log(`    ${chk.toString('ascii', o, o + 8).replace(/\0+$/, '').padEnd(9)} vaddr=0x${chk.readUInt32LE(o + 12).toString(16)} rawptr=0x${chk.readUInt32LE(o + 20).toString(16)} rawsize=0x${chk.readUInt32LE(o + 16).toString(16)}`);
  }
  console.log(bad === 0 ? '  ALL CHECKS PASSED' : `  ${bad} PROBLEM(S)`);
}

