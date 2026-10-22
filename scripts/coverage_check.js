// Scan STRG strings for user-facing English prose that is NOT covered by any
// localization table -> potential untranslated text still shown in game.
const fs = require('fs');
const path = require('path');

const root = 'E:\\FalseEcho_CN';

function readTsv(p) {
  const raw = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  const out = [];
  for (const line of raw.split('\n')) {
    if (line === '' && out.length) continue;
    const i = line.indexOf('\t');
    if (i < 0) { out.push([line, '']); continue; }
    out.push([line.slice(0, i), line.slice(i + 1)]);
  }
  return out;
}

// --- load STRG ---
const strg = readTsv(path.join(root, 'extracted', 'strings.tsv')).map(([k, v]) => {
  const m = /^\[(\d+)\]$/.exec(k);
  return { idx: m ? +m[1] : -1, s: v };
});

// --- load loc tables (keys + EN text) ---
const locFiles = [
  ['loc', 'Localization - EN.tsv'],
  ['loc', 'Endless EN.tsv'],
  ['loc', 'War Diary - EN.tsv'],
  ['loc', 'Frontline News EN.tsv'],
];
const locKeys = new Set();
const locTexts = new Set();
for (const [d, f] of locFiles) {
  const rows = readTsv(path.join(root, d, f));
  for (const [k, v] of rows) {
    locKeys.add(k);
    if (v) locTexts.add(v);
    // also add a value column if present (key\tvalue\ten)
  }
}

const hasCJK = s => /[\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(s);
const isProse = s => {
  if (!s || s.length < 18) return false;
  if (hasCJK(s)) return false;
  if (/^[\x00-\x1F]/.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 10) return false;
  // must contain whitespace -> looks like a sentence, not an identifier
  if (!/\s/.test(s)) return false;
  // skip things that look like code / paths / identifiers
  if (/^[\w.:\-\/\\]+$/.test(s)) return false;
  return true;
};

const covered = s => locTexts.has(s);

const suspicious = strg.filter(o => isProse(o.s) && !covered(o.s));

console.log('STRG total          :', strg.length);
console.log('loc table keys      :', locKeys.size);
console.log('loc table EN values :', locTexts.size);
console.log('prose-looking STRG :', strg.filter(o => isProse(o.s)).length);
console.log('NOT covered by loc  :', suspicious.length);
console.log('');

const groups = new Map();
for (const o of suspicious) {
  const key = o.s.replace(/[A-Za-z0-9_'"\-.,:;!?()\[\]]/g, '#').slice(0, 40);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(o);
}
const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
console.log('--- top 40 pattern groups ---');
for (const [k, arr] of sorted.slice(0, 40)) {
  console.log('[' + arr.length + '] ' + arr[0].idx + '  ' + JSON.stringify(arr[0].s.slice(0, 120)));
}
console.log('');
console.log('--- first 60 individual uncovered strings ---');
for (const o of suspicious.slice(0, 60)) {
  console.log(o.idx + '\t' + JSON.stringify(o.s.slice(0, 150)));
}
fs.writeFileSync(path.join(root, 'extracted', 'uncovered_strg.json'),
  JSON.stringify(suspicious.map(o => o.idx + '\t' + o.s), null, 1), 'utf8');
console.log('\nwrote extracted/uncovered_strg.json');
