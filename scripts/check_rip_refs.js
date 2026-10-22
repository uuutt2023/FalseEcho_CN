// Validate every patched RIP-relative reference: the 4 bytes before the
// disp32 must be part of a real x64 RIP-relative memory operand
// (opcode + ModRM with mod=00, r/m=101).
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const peOff = 0x1000; // placeholder, computed below
function peInfo(buf) {
  const pe = buf.readUInt32LE(0x3C);
  const optSize = buf.readUInt16LE(pe + 20);
  const n = buf.readUInt16LE(pe + 6);
  const so = pe + 24 + optSize;
  const secs = [];
  for (let i = 0; i < n; i++) {
    const o = so + i * 40;
    secs.push({
      name: buf.toString('ascii', o, o + 8).replace(/\0+$/, ''),
      vaddr: buf.readUInt32LE(o + 12), vsize: buf.readUInt32LE(o + 8),
      rawsize: buf.readUInt32LE(o + 16), rawptr: buf.readUInt32LE(o + 20),
    });
  }
  return { pe, secs, imageBase: buf.readBigUInt64LE(pe + 24 + 24) };
}

// A RIP-relative memory operand has ModRM byte: mod=00, r/m=101 -> 0x05/0x0D/0x15/0x1D/0x25/0x2D/0x35/0x3D
const RIPRM = new Set([0x05, 0x0d, 0x15, 0x1d, 0x25, 0x2d, 0x35, 0x3d]);
function checkRef(buf, q) {
  // look back up to 4 bytes for [REX] opcode ModRM
  for (let back = 1; back <= 4; back++) {
    const p = q - back;
    if (p < 0) break;
    const modrm = buf[p];
    if (!RIPRM.has(modrm)) continue;
    // the byte before the modrm should be an opcode
    const op = buf[p - 1];
    if (op === undefined) continue;
    const isMemOpcode =
      (op >= 0x88 && op <= 0x8b) ||    // mov/lea etc
      op === 0x8d ||                   // lea
      (op >= 0x03 && op <= 0x3b) ||    // add/or/adc/sbb/and/sub/xor/cmp
      op === 0x63 || op === 0x69 || op === 0x6b ||
      op === 0x80 || op === 0x81 || op === 0x83 ||
      (op >= 0xC6 && op <= 0xC7) ||
      op === 0x84 || op === 0x85 ||
      op === 0x86 || op === 0x87;
    // REX prefix may sit right before the opcode
    const prev = buf[p - 2];
    const hasRex = prev !== undefined && (prev & 0xF0) === 0x40;
    if (isMemOpcode || hasRex) {
      return { ok: true, op: op.toString(16), modrm: modrm.toString(16), back, rex: !!hasRex };
    }
  }
  return { ok: false };
}

const out = path.join(root, 'out', 'FalseEcho_cn.exe');
const buf = fs.readFileSync(out);
const info = peInfo(buf);
const text = info.secs.find(s => s.name === '.text');
console.log(`.text rawptr=0x${text.rawptr.toString(16)} rawsize=0x${text.rawsize.toString(16)}`);

// re-derive all relocation refs from the spec by scanning for the patched values
const spec = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'exe_spec.json'), 'utf8'));
// find the log of patched refs
const logTxt = fs.existsSync(path.join(root, 'out', 'patch_log.txt'))
  ? fs.readFileSync(path.join(root, 'out', 'patch_log.txt'), 'utf8') : '';
const refs = [...logTxt.matchAll(/patched RIP disp32 @0x([0-9a-f]+): 0x[0-9a-f]+ -> 0x[0-9a-f]+\s+\(([^)]+)\)/g)]
  .map(m => ({ q: parseInt(m[1], 16), label: m[2] }));

let bad = 0;
for (const r of refs) {
  const c = checkRef(buf, r.q);
  if (!c.ok) { bad++; console.log(`  BAD  @0x${r.q.toString(16)} (${r.label})  bytes=${buf.slice(r.q - 4, r.q + 4).toString('hex')}`); }
}
console.log(`\nchecked ${refs.length} refs from log, invalid instruction contexts: ${bad}`);
if (!refs.length) console.log('(no patch log found - run exe_patch.js with output redirection to out/patch_log.txt)');
