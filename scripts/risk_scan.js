// Risk scan of trans/literal_map.json: find entries that look like
//  * mission-JSON data keys      (SENDER ID:, STAMP:, DATE:, ...)
//  * cipher / encoded payloads
//  * msg_dec / msg_enc / cipher / decoded keys
//  * Endless "expected" input targets
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';
const load = (i) => JSON.parse(fs.readFileSync(path.join(root, 'extracted', `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());

const keys = new Set(), vals = new Set();
for (const i of [2575, 2576, 2577, 2578, 2579]) {
  for (const row of load(i)) {
    if (typeof row[0] === 'string') keys.add(row[0].replace(/\r/g, '').trim());
    for (let c = 1; c < row.length; c++) if (typeof row[c] === 'string') vals.add(row[c].replace(/\r/g, '').trim());
  }
}

const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const RISKY_KEYLIKE = /^(SENDER ID|STAMP|DATE|ROTOR|CABLE|SIGN|PAPERS|APPRCODE|APPROVAL|ECHO|TRUE|FALSE|PROPMIN|STASECHQ|AVAILABLE)\b\s*:?/i;
const CIPHERISH = /^[A-Z0-9]{8,}(\s[A-Z0-9]{1,8})*$/;
const PRONOUN = /^(msg_dec|msg_enc|t_msg|day_99_txt_msg_encode|day_99_txt_msg_message_generic)/i;

let flagged = 0;
for (const [k, v] of Object.entries(map)) {
  const t = k.trim();
  const reasons = [];
  if (RISKY_KEYLIKE.test(t)) reasons.push('data-key-like');
  if (PRONOUN.test(t)) reasons.push('cipher/encoded key');
  if (CIPHERISH.test(t) && t.length >= 12) reasons.push('cipherish');
  if (keys.has(t)) reasons.push('TABLE KEY');
  if (t.length <= 6 && /^[A-Z ]+$/.test(t)) reasons.push('short all-caps token');
  if (reasons.length) {
    flagged++;
    console.log(`FLAG [${reasons.join(',')}]`);
    console.log(`   EN: ${JSON.stringify(k)}`);
    console.log(`   CN: ${JSON.stringify(v)}`);
  }
}
console.log(`\nflagged ${flagged} / ${Object.keys(map).length}`);

// full TSV dump for eyeball review
const out = path.join(root, 'trans', 'literal_map_review.tsv');
fs.writeFileSync(out, Object.entries(map).map(([k, v]) => `${k.replace(/\t/g, ' ')}\t${v.replace(/\t/g, ' ')}`).join('\n'), 'utf8');
console.log(`-> ${out}`);
