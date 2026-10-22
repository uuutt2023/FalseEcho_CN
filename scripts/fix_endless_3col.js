// Fix the two 3-column rows in the CN Endless blob (2575).
//
// The English CSV had unquoted commas, so the row was split into 3 fields:
//   [key, "Verification message. Short check", " no speech."]
// The game reads field 1 and may join fields 1..n with ",".
// To stay safe under BOTH readings we split the Chinese sentence at the same
// comma and leave the second column non-empty.
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const blobsPath = path.join(root, 'apply', 'blobs.json');
const blobs = JSON.parse(fs.readFileSync(blobsPath, 'utf8'));

const FIX = [
  {
    key: 'day_99_txt_dia_ver_intro_01',
    old: '核验电文。简查\\t不出声。',
    c1: '核验电文。简查，',
    c2: '不出声。',
  },
  {
    key: 'day_99_txt_dia_endless_dialogue_sailors_npc_encode_exit_01_false_04',
    old: null,
    c1: '要不要我和你过一遍细节，',
    c2: '不过还缺了点东西……比如授权。',
  },
];

let text = blobs['2575'];
for (const f of FIX) {
  // locate the row: ["key", <field1>, <field2>]
  const keyPos = text.indexOf(`"${f.key}"`);
  if (keyPos < 0) { console.log(`!! ${f.key}: key not found`); continue; }
  const rowStart = text.lastIndexOf('[', keyPos);
  const rowEnd = text.indexOf(']', keyPos);
  const row = text.slice(rowStart, rowEnd + 1);
  console.log(`\n${f.key}\n  old row: ${row}`);
  const newRow = `["${f.key}","${f.c1}","${f.c2}"]`;
  text = text.slice(0, rowStart) + newRow + text.slice(rowEnd + 1);
  console.log(`  new row: ${newRow}`);
}
blobs['2575'] = text;
fs.writeFileSync(blobsPath, JSON.stringify(blobs, null, 1), 'utf8');
console.log('\n-> ' + blobsPath);

// sanity: still valid JSON with the same row count
const arr = JSON.parse(text);
console.log(`blob 2575 parses OK, rows=${arr.length}`);
const i14 = arr.findIndex(r => r[0] === 'day_99_txt_dia_ver_intro_01');
console.log('row', i14, JSON.stringify(arr[i14]));
