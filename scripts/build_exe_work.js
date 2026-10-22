// Build the final worklist straight from the EXE string pool.
// Output: trans/exe_work.tsv  ->  off \t slotBytes \t text
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';
const exePath = 'E:\\SteamLibrary\\steamapps\\common\\False Echo Demo\\False Echo.exe';

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

// owner map
const LIB = /Crystal|PPFX|__cle|__ppf|AlphaBaker|Baker/i;
let owner = null;
// the game code region starts at the first gml_* symbol in the pool
const gameStart = Math.min(...items.filter(it => /^gml_/.test(it.s)).map(it => it.off));
for (const it of items) {
  if (it.off < gameStart) { it.owner = null; continue; }
  if (/^gml_(Script|GlobalScript|Object)_/.test(it.s)) {
    const parts = it.s.split('@');
    owner = parts[parts.length - 1];
  }
  it.owner = owner;
}
console.log('game code region starts at 0x' + gameStart.toString(16));

// English table values (original blobs) -> table-driven, skip
const tableVals = new Set();
for (let i = 2575; i <= 2579; i++) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const arr = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000\s]+$/g, ''));
  for (const row of arr) {
    if (Array.isArray(row)) for (const c of row) if (typeof c === 'string') tableVals.add(c.replace(/\r/g, '').trim());
    else if (typeof row === 'string') tableVals.add(row.replace(/\r/g, '').trim());
  }
}
const norm = s => s.replace(/\r/g, '').trim();

// dev-owner / dev-word filters
const DEV_OWNER = /test|debug|TEST_MOUSE|PostProcessing|CleanUp|obj_dornier|scr_content_payload|wishlist|retromagine|dialog_list|crumble/i;
const DEV_WORD = /\b(shader|vertex|fragment|uniform|precision|VRAM|Renderer|layer|Layers|Sprite|Normals|Emissive|Material|Light|Lights|Curve|profile|inspector|stack|Surface|LUT|bloom|AlphaBaker|IES|Room Start|Object Id)/i;
const LOG_FRAG = /^(→|✅|❌|⚠|🟥|🟨|💬|📌|📁|📦|🚀|⏳|⏹|🏁|🔔|🧼|🧹|🛑|🧩|📐|📖|💾|🗂|🎯|🎬|📡|▶|⛔|🟩|🚪|🌅|⏸|🔨|🛠|🪚|📤|🎲|🤖|\[)/u;
const PATHY = /^[A-Za-z]:\\|^[a-z_]+\/[a-z_.\/]+$|^\.|\.json$|\.csv$|\.txt$|\.ini$|^https?:|^save\/|^data\//i;
const KEYLIKE = /^[a-z0-9_]+$/;

const out = [];
const seen = new Set();
for (const it of items) {
  const t = it.s;
  if (tableVals.has(norm(t))) continue;
  if (!it.owner) continue;                 // engine/runtime strings (not game code)
  if (DEV_OWNER.test(it.owner || '')) continue;
  if (DEV_WORD.test(t)) continue;
  if (LOG_FRAG.test(t)) continue;
  if (PATHY.test(t)) continue;
  if (KEYLIKE.test(t)) continue;
  if (t.length < 4) continue;
  if (!/[.!?,:;]/.test(t)) continue;
  if (!/\s/.test(t)) continue;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters < 4) continue;
  const key = norm(t);
  if (seen.has(key)) continue;
  seen.add(key);
  const slot = Math.ceil((it.s.length + 1) / 8) * 8;
  out.push({ off: it.off, slot, len: it.s.length, text: it.s, owner: it.owner });
}
console.log('worklist size:', out.length);
fs.writeFileSync(path.join(root, 'trans', 'exe_work.tsv'),
  out.map(o => `${o.off}\t${o.slot}\t${o.len}\t${o.owner}\t${o.text.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
console.log('written trans/exe_work.tsv');
for (const o of out) console.log(`${o.off.toString(16)}\tslot=${o.slot}\t${JSON.stringify(o.text).slice(0, 110)}`);
