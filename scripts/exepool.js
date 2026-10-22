// Shared: extract the EXE string pool as NUL-terminated strings (may contain
// newlines), with byte offsets and 8-byte-aligned slot sizes.
const fs = require('fs');

function getSections(exe) {
  const peOff = exe.readUInt32LE(0x3C);
  const optSize = exe.readUInt16LE(peOff + 20);
  const n = exe.readUInt16LE(peOff + 6);
  const secOff = peOff + 24 + optSize;
  const secs = [];
  for (let i = 0; i < n; i++) {
    const o = secOff + i * 40;
    secs.push({
      name: exe.toString('ascii', o, o + 8).replace(/\0+$/, ''),
      vsize: exe.readUInt32LE(o + 8), vaddr: exe.readUInt32LE(o + 12),
      rawsize: exe.readUInt32LE(o + 16), rawptr: exe.readUInt32LE(o + 20),
    });
  }
  return { peOff, optSize, secs, secOff };
}

function extractPool(exe, rdata) {
  const items = [];
  const re = /[\x20-\x7E\n\r\t]{4,}/g;
  const region = exe.toString('latin1', rdata.rawptr, rdata.rawptr + rdata.rawsize);
  let m;
  while ((m = re.exec(region)) !== null) {
    const end = rdata.rawptr + m.index + m[0].length;
    if (end < rdata.rawptr + rdata.rawsize && exe[end] !== 0) continue;   // must be NUL-terminated
    const s = m[0];
    if (!/[A-Za-z]/.test(s)) continue;
    items.push({ off: rdata.rawptr + m.index, s, len: s.length, slot: Math.ceil((s.length + 1) / 8) * 8 });
  }
  return items;
}

function loadPool(exePath) {
  const exe = fs.readFileSync(exePath);
  const { secs } = getSections(exe);
  const rdata = secs.find(s => s.name === '.rdata');
  const items = extractPool(exe, rdata);
  // owner attribution
  let owner = null;
  for (const it of items) {
    if (/^gml_(Script|GlobalScript|Object)_/.test(it.s)) {
      const parts = it.s.split('@');
      owner = parts[parts.length - 1];
    }
    it.owner = owner;
  }
  return { exe, secs, rdata, items };
}

function buildIndex(items) {
  const idx = new Map();
  const add = (k, it) => { if (k && k.length >= 3 && !idx.has(k)) idx.set(k, it); };
  for (const it of items) {
    add(it.s, it);
    add(it.s.replace(/\r/g, ''), it);
    add(it.s.replace(/\r\n/g, '\n'), it);
    add(it.s.replace(/\n/g, '\r\n'), it);
    add(it.s.trim(), it);
    add(it.s.trim().replace(/\r/g, ''), it);
  }
  return idx;
}

module.exports = { loadPool, buildIndex, getSections };
