// convert_breaks.js - paper dialogue: hard line breaks -> space-separated words
//
// Mechanism (verified in-game): the teletyper paper wraps text by SPACE-delimited
// words and sizes each dialogue slot from that wrapped line count.
//   English always has spaces -> the slot math is correct.
//   Chinese has no spaces    -> the game counts 1 line while our inserted CRLF
//                               renders 3~5 lines, so the entry overruns its fixed
//                               slot and collides with the next entry (overlapping glyphs).
// Fix: for keys whose ORIGINAL English string contains no "\n" (i.e. paper dialogue
//   that relies on space wrapping), replace our inserted CRLF with a single space so
//   the game's word-wrap count matches the rendered line count.
//   Keys whose original English contains "\n" (fixed-page documents: roster, manual,
//   daily orders, front-line news, war diary) keep their CRLF untouched.
const fs = require('fs');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const blobArg = (() => { const i = args.indexOf('--blob'); return i >= 0 ? args[i + 1] : null; })();

// Telegram strip bodies / ciphertext: layout fixed by the strip height - keep as is
const KEEP_RE = /(_message|_decoded|_msg_|_msg$|txt_verm_|msg_dec_|msg_enc_)/;

function parseFile(p) { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/\0+$/, '')); }
function parseBlock(s) {
  if (Array.isArray(s)) return s;
  if (s && typeof s === 'object') return s;
  const t = String(s).replace(/\0+$/, '');
  try { return JSON.parse(t); } catch (e) { return JSON.parse(t.slice(0, t.lastIndexOf(']') + 1)); }
}
function entriesOf(block) {
  if (Array.isArray(block)) return block.map(p => (Array.isArray(p) ? [p[0], p[1]] : [p, '']));
  if (block && typeof block === 'object') return Object.entries(block);
  return [];
}
function esc(v) { return JSON.stringify(v).slice(1, -1); }

const preBlobs = parseFile('backup_prebreak/blobs.json.bak');
const curBlobs = parseFile('apply/blobs.json');
const spec = parseFile('apply/exe_spec.json');
const enBlob = {};
for (const id of Object.keys(curBlobs)) {
  try {
    const en = parseBlock(parseFile('extracted/blob_' + id + '.json'));
    enBlob[id] = new Map(entriesOf(en));
  } catch (e) { enBlob[id] = new Map(); }
}

const convList = [], keepList = [];
function classify(key, english) {
  if (KEEP_RE.test(key)) return 'keep';
  if (typeof english === 'string' && english.indexOf('\n') >= 0) return 'keep';
  return 'convert';
}

function convertBlobRaw(rawText, preMap, enMap, blobId) {
  let out = rawText, conv = 0, kept = 0;
  for (const [key0, value0] of entriesOf(parseBlock(rawText))) {
    const key = String(key0);
    const value = value0;
    if (typeof value !== 'string' || value.indexOf('\r\n') < 0) continue;
    const pre = preMap.get(key);
    const en = enMap.get(key);
    const base = (typeof en === 'string') ? en : (typeof pre === 'string' ? pre : null);
    if (base === null) { keepList.push([blobId, key, 'NO-BASE']); continue; }
    if (classify(key, base) === 'keep') { kept++; keepList.push([blobId, key]); continue; }
    const newVal = value.replace(/\r\n/g, ' ');
    const oldEsc = esc(value), newEsc = esc(newVal);
    const keyIdx = out.indexOf('"' + key + '"');
    if (keyIdx < 0) { console.error('  ! key not found:', blobId, key); continue; }
    const valIdx = out.indexOf(oldEsc, keyIdx);
    if (valIdx < 0) { console.error('  ! value not found:', blobId, key); continue; }
    out = out.slice(0, valIdx) + newEsc + out.slice(valIdx + oldEsc.length);
    conv++; convList.push([blobId, key]);
  }
  return { out, conv, kept };
}

const targets = blobArg ? [blobArg] : Object.keys(curBlobs);
for (const blobId of targets) {
  const preMap = new Map(entriesOf(parseBlock(preBlobs[blobId])));
  const enMap = enBlob[blobId] || new Map();
  const raw = curBlobs[blobId];
  const r = convertBlobRaw(raw, preMap, enMap, blobId);
  console.log('blob ' + blobId + ': convert=' + r.conv + ' keep=' + r.kept + '  len ' + raw.length + ' -> ' + r.out.length);
  if (!DRY && r.conv > 0) {
    curBlobs[blobId] = r.out;
    if (spec.blobs[blobId] !== undefined) spec.blobs[blobId] = r.out;
  }
}

// exe string-pool literals: literal_map.json is keyed by the English source string
const litCur = parseFile('trans/literal_map.json');
const litPre = parseFile('backup_prebreak/literal_map.json.bak');
const litChanged = new Map();
let litConv = 0;
for (const en of Object.keys(litCur)) {
  const cur = litCur[en];
  if (typeof cur !== 'string' || cur.indexOf('\r\n') < 0) continue;
  if (classify(en, en) === 'keep') continue;
  const pre = litPre[en];
  if (typeof pre === 'string' && pre.indexOf('\n') >= 0) continue;
  const newVal = cur.replace(/\r\n/g, ' ');
  if (litChanged.has(cur) && litChanged.get(cur) !== newVal) console.error('  ! literal conflict', en);
  litChanged.set(cur, newVal);
  litConv++;
  convList.push(['literal', en]);
}
console.log('exe literals: convert=' + litConv);
if (!DRY && litConv > 0) {
  for (const en of Object.keys(litCur)) {
    if (litChanged.has(litCur[en])) litCur[en] = litChanged.get(litCur[en]);
  }
  let n = 0;
  for (const lit of spec.literals) {
    if (litChanged.has(lit.text)) { lit.text = litChanged.get(lit.text); n++; }
  }
  console.log('  updated ' + n + ' spec literals');
}

console.log('\n== converted key groups ==');
const g = new Map();
for (const [b, k] of convList) {
  const key = String(k).replace(/[0-9]+$/, '');
  const kk = b + ':' + key;
  g.set(kk, (g.get(kk) || 0) + 1);
}
for (const [k, n] of [...g.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(48) + ' ' + n);

if (!DRY) {
  fs.writeFileSync('apply/blobs.json', JSON.stringify(curBlobs, null, 1));
  fs.writeFileSync('apply/exe_spec.json', JSON.stringify(spec, null, 1));
  fs.writeFileSync('trans/literal_map.json', JSON.stringify(litCur, null, 1));
  console.log('\nwritten: apply/blobs.json, apply/exe_spec.json, trans/literal_map.json');
}
