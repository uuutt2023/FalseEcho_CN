// Decompress the 5 baked blobs from the original exe and show the raw CSV text
// around the rows that have 3 columns.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';

const exe = fs.readFileSync(path.join(root, 'backup_original', 'False Echo.exe'));
// baked blobs are base64+zlib; find them by scanning for the known markers
function findBaked(off) {
  // blob layout: 4-byte len? then base64 ascii until NUL
  let end = off;
  while (end < exe.length && exe[end] !== 0) end++;
  const b64 = exe.slice(off, end).toString('latin1');
  return zlib.inflateSync(Buffer.from(b64, 'base64')).toString('utf8');
}

const offs = { 2575: 0x2f2b220, 2576: 0x2f16430, 2577: 0x2f42440, 2578: 0x2f1bbf0, 2579: 0x2f16c60 };
for (const [k, off] of Object.entries(offs)) {
  let text;
  try { text = findBaked(off); } catch (e) { console.log(k, 'decompress failed', e.message); continue; }
  const lines = text.split(/\r?\n/);
  console.log(`=== blob ${k}: ${lines.length} lines, ${text.length} chars`);
  const probes = {
    2575: ['day_99_txt_dia_ver_intro_01', 'day_99_txt_dia_endless_dialogue_sailors_npc_encode_exit_01_false_04', 'day_99_txt_msg_ver_01'],
    2576: ['AVAILABLE'],
    2577: ['txt_fn_d1_news_public'],
    2578: ['txt_wrn_subtitle'],
    2579: ['wd_ar_signhere'],
  }[k] || [];
  for (const p of probes) {
    const idx = lines.findIndex(l => l.startsWith(p));
    if (idx < 0) { console.log(`   [${p}] NOT FOUND`); continue; }
    console.log(`   [${p}] line ${idx}:`);
    console.log('     ' + JSON.stringify(lines[idx]).slice(0, 600));
  }
  fs.writeFileSync(path.join(root, 'extracted', `baked_${k}.csv`), text, 'utf8');
}
