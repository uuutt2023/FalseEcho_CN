// Coverage check: every English label observed in the in-game screenshots must
// be present in literal_map.json (so it gets patched).
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const keys = new Set(Object.keys(map));

const observed = [
  // main menu / settings (drv01, drv05, drv06)
  'RESET', 'TUTORIAL', 'FPS LIMIT', '60 FPS', 'UNLIMITED', 'False Echo Demo v. 0.9.8.4',
  // endless tutorial popup (drv08)
  'IMPORTANT NOTE!', 'EXPERIMENTAL ENDLESS MODE', 'CANCEL', 'ACCEPT',
  // endless settings panel (drv09)
  'ENDLESS MODE', 'DIFFICULTY', 'EASY', 'MEDIUM', 'HARD', 'TIMER', 'STAMPS', 'ROTORS',
  'CABLES', 'SIGNATURES', 'TELETYPER', 'PLAY',
  // endless in-game (drv10..drv12)
  'PRESS ANY KEY TO CONTINUE', 'HOLD SPACE TO SKIP',
];
for (const s of observed) {
  console.log(`${keys.has(s) ? 'OK     ' : 'MISSING'}  ${JSON.stringify(s)}`);
}
console.log('\n--- map entries starting with the same word (fuzzy view):');
for (const s of observed) {
  if (keys.has(s)) continue;
  const w = s.split(' ')[0].toUpperCase();
  const near = [...keys].filter(k => k.toUpperCase().startsWith(w));
  if (near.length) console.log(`  ${JSON.stringify(s)} -> ${near.map(n => JSON.stringify(n)).join(', ')}`);
}
