// scan_leftover_en.js —— 扫描所有中文译文中残留的英文单词（排除已知专名/缩写）
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));

// 允许的英文专名/缩写/技术词
const ALLOW = new Set([
  'discord', 'opparks', 'oppark', 'stasec', 'sub', 'swо', 'swo', 'xo', 'po', 'echo', 'true', 'false',
  'npc', 'ui', 'fps', 'id', 'ok', 'npc', 'json', 'txt', 'png', 'gm', 'html', 'url', 'www',
  'steam', 'dlc', 'gml', 'nte', 'pvp', 'hp', 'mp', 'bgm', 'sfx', 'x', 'ii', 'iii', 'iv', 'vi', 'vii',
  'pigeonpost', 'naval', 'hq', 'oppressia', 'sovetia', 'gerlin', 'karsk', 'lomnia', 'formea',
  'retromagine', 'demo', 'beta', 'v', 'vmr', 'mr', 'sir', 'captain', 'lt', 'cdr', 'plc', 'xoo',
  'retro', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'w', 'y', 'z',
]);

const hits = [];
function scan(label, en, cn) {
  if (typeof cn !== 'string') return;
  // 连续的拉丁字母串（长度>=2）
  const words = cn.match(/[A-Za-z][A-Za-z'’-]{1,}/g) || [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (ALLOW.has(lw)) continue;
    hits.push({ label, en: String(en).slice(0, 70), word: w, cn: cn.slice(0, 160) });
  }
}
for (const [en, cn] of Object.entries(map)) scan('literal', en, cn);
for (const [id, text] of Object.entries(blobs)) {
  const raw = text.replace(/[\u0000]+$/, '').trimEnd();
  let rows = [];
  try { rows = JSON.parse(raw); } catch (e) {
    for (const l of raw.split('\n')) { if (!l.trim()) continue; try { rows.push(JSON.parse(l)); } catch (e2) {} }
  }
  const walk = (n, path) => {
    if (typeof n === 'string') { scan(`blob ${id} ${path}`, path, n); return; }
    if (Array.isArray(n)) { n.forEach((v, i) => walk(v, path + '/' + i)); return; }
    if (n && typeof n === 'object') for (const k of Object.keys(n)) walk(n[k], path + '/' + k);
  };
  walk(rows, '');
}
console.log(`疑似残留英文 ${hits.length} 处`);
const seen = new Set();
for (const h of hits) {
  const k = h.word.toLowerCase();
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`\n[${h.word}]  源: ${h.label} ${JSON.stringify(h.en)}`);
  console.log(`   译文: ${JSON.stringify(h.cn)}`);
}
