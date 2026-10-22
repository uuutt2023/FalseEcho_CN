// Associate each exe pool string with the script that owns it, so we can tell
// game copy apart from the Crystal/PPFX debug library copy.
const fs = require('fs');
const exePath = process.argv[2];
const exe = fs.readFileSync(exePath);
const peOff = exe.readUInt32LE(0x3C);
const optSize = exe.readUInt16LE(peOff + 20);
const n = exe.readUInt16LE(peOff + 6);
const secOff = peOff + 24 + optSize;
let rdata = null;
for (let i = 0; i < n; i++) {
  const o = secOff + i * 40;
  const name = exe.toString('ascii', o, o + 8).replace(/\0+$/, '');
  if (name === '.rdata') rdata = { rawptr: exe.readUInt32LE(o + 20), rawsize: exe.readUInt32LE(o + 16) };
}
const region = exe.toString('latin1', rdata.rawptr, rdata.rawptr + rdata.rawsize);
const re = /[\x20-\x7E]{4,}/g;
let m;
const items = [];
while ((m = re.exec(region)) !== null) {
  items.push({ off: rdata.rawptr + m.index, s: m[0] });
}
console.log('pool items:', items.length);

const LIB = /Crystal|PPFX|__cle|__ppf|AlphaBaker|IES|Baker/i;
let owner = null;
const ownerCount = new Map();
for (const it of items) {
  if (/^gml_(Script|GlobalScript|Object)_/.test(it.s)) {
    const parts = it.s.split('@');
    owner = parts[parts.length - 1];
    ownerCount.set(owner, (ownerCount.get(owner) || 0) + 1);
  }
  it.owner = owner;
}
console.log('distinct owners:', ownerCount.size);
const lib = [...ownerCount.keys()].filter(o => LIB.test(o));
console.log('library-ish owners:', lib.length);
console.log(lib.slice(0, 25).join('\n'));

// how many worklist strings are owned by a library owner?
const rows = fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean).map(l => {
  const p = l.split('\t');
  return { idx: +p[0], exe: p[1], s: p[2] };
});
const byText = new Map();
for (const it of items) if (!byText.has(it.s.trim())) byText.set(it.s.trim(), it);
let libCount = 0, gameCount = 0, noOwner = 0;
const gameList = [];
for (const r of rows) {
  const it = byText.get(r.s.replace(/\\r$/, '').trim());
  if (!it) { noOwner++; continue; }
  if (it.owner && LIB.test(it.owner)) libCount++;
  else { gameCount++; gameList.push({ ...r, owner: it.owner, off: it.off }); }
}
console.log(`\nworklist: library-owned=${libCount}  game-owned=${gameCount}  unmatched=${noOwner}`);
fs.writeFileSync(process.argv[4] || 'trans/exe_literals_game.tsv',
  gameList.map(g => `${g.idx}\t${g.exe}\t${g.owner}\t${g.s}`).join('\n'), 'utf8');
console.log('written', process.argv[4] || 'trans/exe_literals_game.tsv');
