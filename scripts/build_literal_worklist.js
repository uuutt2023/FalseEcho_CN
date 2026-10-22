// Build the worklist of hardcoded (non-table) player-facing strings that must
// be patched directly in the exe's string pool.
//
// A string is "table-driven" if it is a VALUE in one of the 5 baked tables
// (those get translated by patching the tables). Everything else that is
// player-facing has to be patched as a literal.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = 'E:\\FalseEcho_CN';
const exePath = 'E:\\SteamLibrary\\steamapps\\common\\False Echo Demo\\False Echo.exe';

// ---- original data.win STRG ----
function readTsv(p) {
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  return raw.split('\n').filter(l => l.length).map(l => {
    const i = l.indexOf('\t');
    return [l.slice(0, i), l.slice(i + 1)];
  });
}
const strgRows = readTsv(path.join(root, 'extracted', 'strings.tsv'))
  .map(([k, v]) => ({ idx: +/^\[(\d+)\]$/.exec(k)[1], s: v }));

// ---- current (Chinese) table values ----
const cur = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const tableValues = new Set();
for (const k of Object.keys(cur)) {
  const arr = JSON.parse(String(cur[k]).replace(/[\u0000\s]+$/g, ''));
  for (const row of arr) {
    if (Array.isArray(row)) { for (const cell of row) if (typeof cell === 'string') tableValues.add(cell); }
    else if (typeof row === 'string') tableValues.add(row);
  }
}
const norm = s => (s == null ? '' : String(s)).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
const tableValuesNorm = new Set([...tableValues].map(norm));

// ---- exe string pool ----
const exe = fs.readFileSync(exePath);
const peOff = exe.readUInt32LE(0x3C);
const optSize = exe.readUInt16LE(peOff + 20);
const numSections = exe.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
const secs = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  secs.push({ name: exe.toString('ascii', o, o + 8).replace(/\0+$/, ''), vsize: exe.readUInt32LE(o + 8), vaddr: exe.readUInt32LE(o + 12), rawsize: exe.readUInt32LE(o + 16), rawptr: exe.readUInt32LE(o + 20) });
}
const rdata = secs.find(s => s.name === '.rdata');
// pool = runs of printable ASCII inside .rdata (each pool string is NUL-terminated
// and padded to an 8-byte boundary)
const poolStrings = [];
{
  const region = exe.toString('latin1', rdata.rawptr, rdata.rawptr + rdata.rawsize);
  const re = /[\x20-\x7E]{4,}/g;
  let m;
  while ((m = re.exec(region)) !== null) {
    poolStrings.push({ off: rdata.rawptr + m.index, len: m[0].length, s: m[0] });
  }
}
console.log('pool strings in .rdata:', poolStrings.length);
const poolByText = new Map();
for (const p of poolStrings) {
  const k = p.s.trim();
  if (k.length >= 4 && !poolByText.has(k)) poolByText.set(k, p);
}

// ---- filters for "player-facing" ----
const devPat = [
  /^gml_/, /^__/, /^u_/, /^spr_/, /^fnt_/, /^obj_/, /^scr_/, /^snd_/, /^bg_/, /^seq_/, /^anim_/,
  /^tl[_\-]/, /^rm_/, /^inst_/, /^path_/, /^sh[_\-]/, /@/, /Crystal/i, /PPFX/i, /__cle_/i, /__ppf_/i,
  /^#/, /^\/\//, /^precision /, /uniform|varying|attribute|texture2D|gl_|vec[234]|mat[234]|sampler/i,
  /^[A-Za-z]:\\/, /\.yyp$|\.lightdata$|\.ies$|\.json$|\.csv$/i, /^\d+$/,
];
const devWords = /\b(shader|vertex|fragment|uniform|precision|alpha|render_?target|framebuffer|LUT|lut|bloom|polar|radial|distortion|dither|shadow map|lightmap|post-?process|camera|viewport|surface|instance|instance_create|variable|struct|array|ds_map|ds_list)\b/i;
const logPat = /^(⚠|❌|🟥|🟨|💬|📌|📁|📦|🚀|⏳|⏹|🏁|🔔|🧼|🧹|🛑|🧩|🪚|🔨|🎯|🎬|📡|▶|⛔|📐|📖|💾|🗂|🎲)/u;
const logTag = /^\[[A-Za-z_][\w ]*\]/;
const serbian = /\b(Nema|nije|je |Prosleđena|postavljen|pošle|sačuvan|Aktiviran|Čekamo|grupa|Poruke|Nasled|Definitivno|greška|greške|uspešno|Prosledjena)\b/;

function classify(s) {
  if (!s) return 'skip';
  if (tableValuesNorm.has(norm(s))) return 'table';
  if (s.length < 6) return 'skip';
  if (devPat.some(p => p.test(s))) return 'skip';
  if (devWords.test(s)) return 'skip';
  if (logPat.test(s) || logTag.test(s)) return 'skip';
  if (serbian.test(s)) return 'skip';
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 4) return 'skip';
  if (!/\s/.test(s)) return 'skip';         // identifiers / single words
  if (!/[.!?,:;]/.test(s)) return 'skip';   // needs sentence-ish punctuation
  return 'literal';
}

const work = [];
for (const row of strgRows) {
  const c = classify(row.s);
  if (c !== 'literal') continue;
  const pool = poolByText.get(row.s.trim());
  work.push({ idx: row.idx, s: row.s, key: row.s.trim(), inExe: !!pool, off: pool ? pool.off : null, slot: pool ? pool.len : null });
}
console.log('\nplayer-facing literals (not table-driven):', work.length);
console.log('  present in exe pool :', work.filter(w => w.inExe).length);
console.log('  NOT in exe pool     :', work.filter(w => !w.inExe).length);
fs.writeFileSync(path.join(root, 'trans', 'exe_literals.tsv'),
  work.map(w => w.idx + '\t' + (w.inExe ? '1' : '0') + '\t' + w.s.replace(/\n/g, '\\n').replace(/\r/g, '\\r')).join('\n'), 'utf8');
console.log('written trans/exe_literals.tsv');

// quick stats on slot headroom for the in-exe ones
const heads = work.filter(w => w.inExe);
console.log('\nsample:');
for (const w of heads.slice(0, 40)) console.log(`  [${w.idx}] slot=${w.slot} ${JSON.stringify(w.s.slice(0, 80))}`);
