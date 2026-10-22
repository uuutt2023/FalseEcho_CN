// verify_keys.js —— 校验已翻译的 9 个烘焙块：键列是否与原文逐字节一致
// 键被误改 = 运行时查表返回空串 = 整块 UI 空白
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

function readBlobFile(id) {
  const p = path.join(root, 'extracted', `blob_${id}.json`);
  const raw = fs.readFileSync(p, 'utf8').replace(/[\u0000]+$/, '').trimEnd();
  try { return JSON.parse(raw); } catch (e) {
    const rows = [];
    for (const l of raw.split('\n')) { if (!l.trim()) continue; try { rows.push(JSON.parse(l)); } catch (e2) {} }
    return rows;
  }
}

const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const IDS = Object.keys(blobs).map(Number).sort((a, b) => a - b);

function keysOf(id) {
  const t = readBlobFile(id);
  const out = [];
  if (Array.isArray(t)) {
    for (const row of t) {
      if (Array.isArray(row) && row.length) out.push(String(row[0]));
    }
  } else if (t && typeof t === 'object') {
    for (const k of Object.keys(t)) out.push(k);
  }
  return out;
}

let bad = 0;
for (const id of IDS) {
  const orig = keysOf(id);
  const neu = readBlobFile(id);   // 旧文件是原文，新内容在 blobs.json
  const neuKeys = [];
  const newText = blobs[String(id)];
  // 新块是 JSONL 文本（base64 解出的是明文 JSON 文本），直接解析
  const parsed = (() => { try { return JSON.parse(newText.replace(/[\u0000]+$/, '').trimEnd()); } catch (e) {
    const rows = []; for (const l of newText.split('\n')) { if (!l.trim()) continue; try { rows.push(JSON.parse(l)); } catch (e2) {} } return rows; } })();
  if (Array.isArray(parsed)) { for (const row of parsed) if (Array.isArray(row) && row.length) neuKeys.push(String(row[0])); }
  else if (parsed && typeof parsed === 'object') for (const k of Object.keys(parsed)) neuKeys.push(k);

  const same = orig.length === neuKeys.length && orig.every((k, i) => k === neuKeys[i]);
  console.log(`block ${id}: 原 ${orig.length} 键 / 新 ${neuKeys.length} 键  -> ${same ? '键列完全一致 OK' : '!!! 键列不一致 !!!'}`);
  if (!same) {
    bad++;
    const n = Math.max(orig.length, neuKeys.length);
    let shown = 0;
    for (let i = 0; i < n && shown < 25; i++) {
      if (orig[i] !== neuKeys[i]) { console.log(`   [${i}] 原=${JSON.stringify(orig[i])}  新=${JSON.stringify(neuKeys[i])}`); shown++; }
    }
  }
}
console.log(bad === 0 ? '\nALL KEY COLUMNS OK' : `\n${bad} 个块的键列被改动`);
