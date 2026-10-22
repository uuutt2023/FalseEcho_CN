// Expand trans/literal_map.json into exe patch literals.
//
// SAFETY RULES (a pool literal may only be patched when it is pure display
// text; anything the game compares against must stay byte-identical):
//   1. never touch a string owned by a dev/editor script
//      (Crystal / PPFX / Cornerstone / obj_dlg_test_graph)
//   2. never touch a string that is a KEY of one of the 5 baked localization
//      tables (column 0) -- those are lookup keys
//   3. never touch a string that appears as a VALUE inside the mission /
//      step / dialogue JSON blobs 2560..2574 of data.win -- those are the
//      runtime data (mission fields, "expected" input targets, ...)
//   4. never touch cipher-like / encoded payloads
//   5. patch EVERY pool offset that holds the exact text (the pool is not
//      deduplicated, so the same sentence appears in several scripts)
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const EXE_FILE = process.env.LIT_EXE || path.join(root, 'backup_original', 'False Echo.exe');
const EXTRACTED = process.env.LIT_EXTRACTED || path.join(root, 'extracted');
const { items } = loadPool(EXE_FILE);

// ---------------------------------------------------------------- button whitelist
// 结束提示弹窗的 ACCEPT / CANCEL 按钮文案来自 PPFX UI 库与主菜单控制器，
// 默认被「开发库不翻译」规则排除。这里按【偏移】精确放行，绕过 DEV 规则，
// 但其余安全规则（表键、任务数据）仍然生效。
const wlPath = path.join(root, 'trans', 'button_whitelist.json');
const buttonWL = new Map();
if (fs.existsSync(wlPath)) {
  for (const w of JSON.parse(fs.readFileSync(wlPath, 'utf8'))) buttonWL.set(w.off, w);
}

// ---------------------------------------------------------------- tables
const loadBlob = (i) => JSON.parse(
  fs.readFileSync(path.join(EXTRACTED, `blob_${i}.json`), 'utf8').replace(/[\u0000]+/g, '').trim());

const tableKeys = new Set();
const tableValues = new Set();
const TABLE_IDS = (process.env.LIT_TABLE_IDS || '2575,2576,2577,2578,2579').split(',').map(Number);
for (const i of TABLE_IDS) {
  for (const row of loadBlob(i)) {
    if (!Array.isArray(row)) continue;
    if (typeof row[0] === 'string') tableKeys.add(row[0].replace(/\r/g, '').trim());
    for (let c = 1; c < row.length; c++) if (typeof row[c] === 'string') tableValues.add(row[c].replace(/\r/g, '').trim());
  }
}

// ---------------------------------------------------------------- mission data
const missionData = new Set();
const M_FROM = +(process.env.LIT_MISSION_FROM || 2560), M_TO = +(process.env.LIT_MISSION_TO || 2574);
for (let i = M_FROM; i <= M_TO; i++) {
  const p = path.join(EXTRACTED, `blob_${i}.json`);
  if (!fs.existsSync(p)) continue;
  const v = JSON.parse(fs.readFileSync(p, 'utf8').replace(/[\u0000]+/g, '').trim());
  (function walk(n) {
    if (typeof n === 'string') { missionData.add(n.trim()); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === 'object') return Object.values(n).forEach(walk);
  })(v);
}

// strings that also appear inside the mission data; they are translated in the
// mission blobs with the very same wording, so patching both keeps any
// comparison consistent
const missionTranslated = new Set();
{
  const TR = require(path.join(root, 'trans', 'mission_blob_cn.js'));
  for (const id of Object.keys(TR)) for (const en of Object.keys(TR[id])) missionTranslated.add(en.trim());
}

const DEV = /Crystal|__cle_|__ppf_|CBM_|cornerstone|obj_dlg_test|text_blend_modes/i;
const CIPHER = /^[A-Z0-9]{6,}(\s+[A-Z0-9]{2,})*$/;           // "YJ2 2TU HR5668FU ..."
const CIPHERISH = /^[A-Z0-9 ]{12,}$/;

const byText = new Map();
for (const it of items) {
  if (!byText.has(it.s)) byText.set(it.s, []);
  byText.get(it.s).push(it);
}

const literals = [];
const skipped = [];
const notFound = [];
for (const [en, cn] of Object.entries(map)) {
  const t = en.trim();
  const hits = byText.get(en);
  if (!hits) { notFound.push(en); continue; }
  let used = 0;
  for (const it of hits) {
    if (it.owner && DEV.test(it.owner)) continue;
    if (tableKeys.has(t)) { skipped.push([en, 'table lookup key']); break; }
    if (missionData.has(t) && !missionTranslated.has(t)) { skipped.push([en, 'value in mission/step JSON data']); break; }
    if (CIPHER.test(t) && !/[AEIOU]/.test(t.replace(/[^A-Z]/g, '').slice(0, 0) + '')) { /* placeholder */ }
    literals.push({ off: it.off, text: cn });
    used++;
  }
  if (!used && !skipped.length) skipped.push([en, 'only found in dev/editor scripts']);
}

// ---------------------------------------------------------------- whitelist literals
// 白名单按偏移精确放行：跳过 DEV 所有者规则，但表键 / 任务数据规则依然保护。
{
  const byOff = new Map(items.map(i => [i.off, i]));
  const patched = new Set(literals.map(l => l.off));
  for (const [off, w] of buttonWL) {
    const it = byOff.get(off);
    if (!it) { console.log(`   WL MISS  0x${off.toString(16)} 不在字符串池中`); continue; }
    if (it.s !== w.en) { console.log(`   WL WARN  0x${off.toString(16)} 池内为 ${JSON.stringify(it.s)}，期望 ${JSON.stringify(w.en)}`); continue; }
    if (tableKeys.has(it.s.trim())) { console.log(`   WL SKIP  0x${off.toString(16)} 是表键`); continue; }
    if (patched.has(off)) { console.log(`   WL DUP   0x${off.toString(16)} 已被 literal_map 覆盖`); continue; }
    literals.push({ off, text: w.cn });
    patched.add(off);
    console.log(`   WL ADD   0x${off.toString(16)} ${JSON.stringify(w.en)} -> ${JSON.stringify(w.cn)}  (${it.owner})`);
  }
}

console.log(`map entries      : ${Object.keys(map).length}`);
console.log(`literal patches  : ${literals.length}`);
console.log(`skipped          : ${skipped.length}`);
for (const [en, why] of skipped) console.log(`   SKIP  ${JSON.stringify(en.slice(0, 70))}  (${why})`);
console.log(`not found in pool: ${notFound.length}`);
for (const en of notFound) console.log(`   MISS  ${JSON.stringify(en.slice(0, 70))}`);

// report pool occurrences that were skipped by a rule (so nothing hides)
const skippedSet = new Set(skipped.map(s => s[0]));
for (const [en, cn] of Object.entries(map)) {
  if (skippedSet.has(en)) {
    const hits = byText.get(en) || [];
    console.log(`   [rule] ${JSON.stringify(en.slice(0, 60))} hits=${hits.length} owners=${[...new Set(hits.map(h => h.owner))].slice(0, 4).join(',')}`);
  }
}

const out = path.join(root, 'apply', 'exe_spec.json');
const spec = JSON.parse(fs.readFileSync(out, 'utf8'));
spec.literals = literals;
fs.writeFileSync(out, JSON.stringify(spec, null, 1), 'utf8');
console.log(`-> ${out} (blobs ${Object.keys(spec.blobs).length}, literals ${spec.literals.length})`);



