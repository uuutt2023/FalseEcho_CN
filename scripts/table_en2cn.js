// Build EN->CN pairs from the already-translated 5 baked tables, so pool
// literals that duplicate a table value can reuse the exact same CN text.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const cn = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const en = {};
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  const p = path.join(root, 'extracted', `blob_${i}.json`);
  const earr = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim());
  const carr = JSON.parse(cn[String(i)].replace(/[\u0000]+/g, '').trim());
  for (let r = 0; r < earr.length; r++) {
    const er = earr[r], cr = carr[r];
    if (!Array.isArray(er) || !Array.isArray(cr)) continue;
    for (let c = 1; c < er.length; c++) {
      const k = er[c]; const v = cr[c];
      if (typeof k !== 'string' || typeof v !== 'string') continue;
      if (k.trim() === v.trim()) continue;              // untranslated
      if (!en[k]) en[k] = v;                            // first wins
    }
  }
}
fs.writeFileSync(path.join(root, 'trans', 'table_en2cn.json'), JSON.stringify(en, null, 0), 'utf8');
console.log(`EN->CN table pairs: ${Object.keys(en).length}`);

// the pool literals we want to translate
const cands = [
  'OPPRESSIA', 'TO VICTORY', 'SIGNATURE', 'ECHO STAMP HERE', 'HAND OVER', 'TRASH', 'FLIP',
  'BURN', 'WAIT', 'ROSTER', 'CITATION', 'MAIN MENU', 'SCROLL TO READ MORE', 'SUB 227',
  'Sub 227', 'NAVAL HQ', 'CAPTAIN', 'PRIVATE', 'VERIFICATION', 'BACK', 'OPEN',
  'GAS MASK CONTAINER', 'TELEPRINTER COPY', 'TELEPRINTER MESSAGE', 'TELEPRINTER PAPER',
  'DECODING OUTPUT', 'ENCODING OUTPUT', 'VER SLIP', 'DECODED', ' HIDDEN', ' BACK',
  'REGULAR STAMPS', 'DECODING MESSAGE OUTPUT', 'ENCODING MESSAGE OUTPUT', 'ENCODING MESSAGE INPUT',
  'DECODING MESSAGE INPUT', 'WISHLIST', 'NAVAL COMMAND', 'To: Lieutenant,', 'STATUS UNCONFIRMED',
  'WISHLIST REQUEST', 'SUPPORT ACKNOWLEDGED', 'MISSING BIO', 'APPROVED', 'INBOUND',
  'CLASSIFIED', 'END SHIFT', 'GAME PAUSED', 'TRANSCRIPT', 'NO TRANSCRIPT AVAILABLE',
  'DECODING MISSION', 'ACCEPT', 'HOLD SPACE TO SKIP', 'One wrong, then random.', 'ROTORS ',
  'I DON\'T HAVE A KEY FOR THIS', 'Wipe the stains.', 'Unclip the papers before archiving.',
  'Show this tutorial on Endless start.', 'Close the drawer first', 'Close the paper cover first',
  'Paper discarded: output attempt cleared and input markers reset.',
  'Enigma session reset after discarded output paper.',
  'Input paper markers cleared after output discard.',
  'Alright, prepare for landing.', 'Less than a minute, Captain!',
  'Navigator, how much further to the rendezvous point?', 'Now where the hell are they?',
  'The demo is only the beginning. Naval Command requests your support for the voyage ahead.',
  'Help us bring the full voyage to life.\nOppressia is counting on you.',
  'Our records are incomplete. Your time aboard Sub 227 has not gone unnoticed.',
  'Your support has reached Naval Command. Preparations for the full voyage are underway.',
  'Oppressia appreciates your support.\nCarry on.',
  'Add ', ' to your Steam wishlist.', 'If you have already wishlisted ', ', thank you.',
  'Thank you for wishlisting ', 'STASEC was unable to determine whether you have wishlisted ',
  'Earlier dates allowed from ', 'Every message consists of INPUT and OUTPUT paper. INPUT PAPER must ALWAYS be stamped with ECHO STAMPER. Output paper requires different stamps or signatures, depending on the mission type. Output papers are pulled from two drawers on your left.\n\nIf a message is not authentic: stamp it FALSE ECHO and give it back right away. If a message is authentic, stamp TRUE ECHO, process the message, clip input and output together and give them back.',
  'For minor infractions you will receive citations. You must bring each citation to the table and shred it before progressing. Major infractions or too many citations will result in a court-martial.\n\nEach incorrect letter deducts ',
  'Thank you for playing the False Echo demo.\n\nThis is only the first part of the voyage. The full game will continue with the remaining days, new missions, and the consequences of your decisions.\n\nIf you have feedback, bug reports, or thoughts, please reach us through Discord or our social channels. Your reviews and wishlists help bring the full voyage to life.',
];
console.log('\n--- pool candidate -> CN source');
for (const c of cands) {
  const hit = en[c];
  console.log(`${hit ? 'TABLE ' : 'MANUAL'}  ${JSON.stringify(c.slice(0, 60))}${hit ? '  =>  ' + JSON.stringify(hit) : ''}`);
}
