// Locate the remaining player-facing strings in the exe pool (they differ from
// the STRG copy only by \r / \n handling).
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const exePath = ['E:', 'SteamLibrary', 'steamapps', 'common', 'False Echo Demo', 'False Echo.exe'].join('/');
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
const idx = new Map();
const add = (k, it) => { if (k && k.length >= 4 && !idx.has(k)) idx.set(k, it); };
for (const it of items) {
  add(it.s, it);
  add(it.s.replace(/\r/g, ''), it);
  add(it.s.replace(/\r\n/g, '\n'), it);
  add(it.s.trim(), it);
}
const targets = [
  'We recommend playing with the tutorial enabled.',
  'SECURITY officer,',
  'Every message consists of INPUT and OUTPUT paper.',
  'For each successful mission you will earn OPPARKS.',
  'For minor infractions you will receive citations.',
  'OPPARK. The full list of deductions is:',
  'By popular demand from the community, Oppressian Naval Command',
  'Loading games...',
  'Help us improve False Echo.',
  'Join the Retromagine community.',
  'Accurate letter: +',
  'No games available.',
  'Opens in your browser.',
  'Link coming soon.',
];
const out = [];
for (const t of targets) {
  const it = idx.get(t) || idx.get(t.replace(/\r/g, '')) || idx.get(t.trim());
  if (!it) { console.log('MISS  ' + JSON.stringify(t.slice(0, 60))); continue; }
  out.push({ off: it.off, slot: Math.ceil((it.s.length + 1) / 8) * 8, text: it.s });
  console.log(`FOUND 0x${it.off.toString(16)} slot=${out[out.length-1].slot} ${JSON.stringify(it.s).slice(0, 110)}`);
}
fs.writeFileSync(path.join(root, 'trans', 'exe_work_extra.tsv'),
  out.map(o => `${o.off}\t${o.slot}\t${o.text.replace(/\n/g, '\\n')}`).join('\n'), 'utf8');
console.log('written trans/exe_work_extra.tsv');
