// For each candidate string: how many pool occurrences, which owners, and is it
// also a value/key in the 5 baked tables?
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const load = (i) => JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());
const tabKeys = new Set(), tabVals = new Set();
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  for (const row of load(i)) {
    if (typeof row[0] === 'string') tabKeys.add(row[0].replace(/\r/g, '').trim());
    for (let c = 1; c < row.length; c++) if (typeof row[c] === 'string') tabVals.add(row[c].replace(/\r/g, '').trim());
  }
}

const cands = [
  'OPPRESSIA', 'TO VICTORY', 'SIGNATURE', 'ECHO STAMP HERE', 'Captain', 'SUB 227', 'Sub 227',
  'NAVAL HQ', 'CAPTAIN', 'HAND OVER', 'OPEN', 'BURN', 'TRASH', 'FLIP', 'WAIT', 'MISSING BIO',
  'APPROVED', 'INBOUND', 'ROSTER', 'CLASSIFIED', 'CITATION', 'STATEMENT', 'END SHIFT', 'GAME PAUSED',
  'MAIN MENU', 'TRANSCRIPT', 'NO TRANSCRIPT AVAILABLE', 'GAS MASK CONTAINER',
  'TELEPRINTER COPY', 'TELEPRINTER MESSAGE', 'TELEPRINTER PAPER', 'DECODING OUTPUT',
  'ENCODING OUTPUT', 'VERIFICATION', 'VER SLIP', 'DECODED', 'PRIVATE', ' HIDDEN', ' BACK',
  'REGULAR STAMPS', 'DECODING MESSAGE OUTPUT', 'ENCODING MESSAGE OUTPUT', 'ENCODING MESSAGE INPUT',
  'DECODING MESSAGE INPUT', 'WISHLIST', 'NAVAL COMMAND', 'To: Lieutenant,', 'SCROLL TO READ MORE',
  'ROTORS ', 'PAPER: ', 'I DON\'T HAVE A KEY FOR THIS', 'ONE WRONG, THEN RANDOM.',
  'ENEMY CONVOY BEARING 220 IN BE24 INVESTIGATE AND REPORT BACK',
  'DECODING MISSION', 'Wipe the stains.', 'Unclip the papers before archiving.',
  'Show this tutorial on Endless start.', 'Close the drawer first', 'Close the paper cover first',
  'Paper discarded: output attempt cleared and input markers reset.',
  'Enigma session reset after discarded output paper.',
  'Input paper markers cleared after output discard.',
  'Alriht, prepare for landing.', 'Less than a minute, Captain!',
  'Navigator, how much further to the rendezvous point?', 'Now where the hell are they?',
];
for (const s of cands) {
  const hits = items.filter(it => it.s === s);
  const owners = [...new Set(hits.map(h => h.owner))];
  console.log(`${String(hits.length).padStart(3)}  tabKey=${tabKeys.has(s) ? 'Y' : '-'} tabVal=${tabVals.has(s) ? 'Y' : '-'}  ${JSON.stringify(s)}`);
  console.log(`      owners: ${owners.join(' | ')}`);
}
