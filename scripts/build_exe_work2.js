// Final worklist: STRG-derived player-facing candidates, resolved to their
// byte offsets inside the EXE string pool (so they can be patched in place).
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';
const exePath = 'E:\\SteamLibrary\steamapps\common\False Echo Demo\\False Echo.exe';

const exe = fs.readFileSync(exePath);
const peOff = exe.readUInt32LE(0x3C);
const optSize = exe.readUInt16LE(peOff + 20);
const n = exe.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
let rdata = null;
for (let i = 0; i < n; i++) {
  const o = secOff + i * 40;
  if (exe.toString('ascii', o, o + 8).replace(/\0+$/, '') === '.rdata')
    rdata = { rawptr: exe.readUInt32LE(o + 20), rawsize: exe.readUInt32LE(o + 16) };
}
const region = exe.toString('latin1', rdata.rawptr, rdata.rawptr + rdata.rawsize);
const items = [];
{
  const re = /[\x20-\x7E]{4,}/g;
  let m;
  while ((m = re.exec(region)) !== null) items.push({ off: rdata.rawptr + m.index, s: m[0] });
}
// index pool by several normalisations
const idx = new Map();
const add = (k, it) => { if (k.length >= 4 && !idx.has(k)) idx.set(k, it); };
for (const it of items) {
  add(it.s, it);
  add(it.s.replace(/\r/g, ''), it);
  add(it.s.replace(/\r\n/g, '\n'), it);
  add(it.s.replace(/\n/g, '\r\n'), it);
  add(it.s.trim(), it);
  add(it.s.trim().replace(/\r/g, ''), it);
}

// owner map (game code region only)
const LIB = /Crystal|PPFX|__cle|__ppf|AlphaBaker/i;
let owner = null;
for (const it of items) {
  if (/^gml_(Script|GlobalScript|Object)_/.test(it.s)) {
    const parts = it.s.split('@');
    owner = parts[parts.length - 1];
  }
  it.owner = owner;
}

const DEV_OWNER = /test|debug|TEST_MOUSE|PostProcessing|CleanUp|obj_dornier|scr_content_payload|wishlist|retromagine/i;

const rows = fs.readFileSync(path.join(root, 'trans', 'exe_literals.tsv'), 'utf8')
  .split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { idx: +p[0], s: p[2] }; });

const out = [];
const missed = [];
for (const r of rows) {
  const raw = r.s.replace(/\\r$/, '').replace(/\\n/g, '\n');
  const it = idx.get(raw) || idx.get(raw.replace(/\r/g, '')) || idx.get(raw.trim());
  if (!it) { missed.push(r); continue; }
  if (DEV_OWNER.test(it.owner || '')) continue;
  out.push({ idx: r.idx, off: it.off, len: it.s.length, slot: Math.ceil((it.s.length + 1) / 8) * 8, text: it.s, owner: it.owner });
}
console.log('resolved:', out.length, ' missed:', missed.length);
fs.writeFileSync(path.join(root, 'trans', 'exe_work.tsv'),
  out.map(o => `${o.off}\t${o.slot}\t${o.len}\t${o.owner}\t${o.text.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
console.log('written trans/exe_work.tsv');
const byOwner = {};
for (const o of out) byOwner[o.owner || '(none)'] = (byOwner[o.owner || '(none)'] || 0) + 1;
console.log('owners:', Object.keys(byOwner).length);
console.log('top:', Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[1] + ' ' + x[0]).join(' | '));
console.log('\n--- all resolved (text only) ---');
for (const o of out) console.log(`${o.idx}\t${o.off.toString(16)}\tslot=${o.slot}\t${JSON.stringify(o.text).slice(0, 120)}`);
