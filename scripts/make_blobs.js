// 生成写回用的 5 个数据块新内容
const fs = require('fs');
const path = require('path');

const OUT = 'E:/FalseEcho_CN/apply';
fs.mkdirSync(OUT, { recursive: true });

function readTsv(p) {
  if (!fs.existsSync(p)) return new Map();
  const m = new Map();
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    const i = line.indexOf('\t');
    if (i < 0) continue;
    m.set(line.slice(0, i), line.slice(i + 1));
  }
  return m;
}

// ---- 译文来源 ----
const main = new Map();
for (const f of fs.readdirSync('E:/FalseEcho_CN/trans').filter(x => /^Localization\.cn\.\d+\.tsv$/.test(x)))
  for (const [k, v] of readTsv('E:/FalseEcho_CN/trans/' + f)) main.set(k, v);

const endless = new Map();
for (const f of fs.readdirSync('E:/FalseEcho_CN/trans/Endless').filter(x => /^out_.*\.tsv$/.test(x)))
  for (const [k, v] of readTsv('E:/FalseEcho_CN/trans/Endless/' + f)) endless.set(k, v);

const war = readTsv('E:/FalseEcho_CN/trans/WarDiary.cn.tsv');

// ---- 操作手册表（blob 2576）----
const MANUAL = {
  'AVAILABLE:': '可用：',
  'DAY 1': '第 1 天',
  'DAY 2': '第 2 天',
  'DAY 3': '第 3 天',
  'SENDER ID: SUBHUNT': '发报方代号：SUBHUNT',
  'STAMP: ECHO, VER, Back': '印章：回响、核验、背面',
  'STAMP: RED, OUTP, Back': '印章：红章、输出、背面',
  'DATE: Actual': '日期：实际',
  'PAPERS: VER ANY Give': '纸张：核验 任意 交付',
  'PAPERS: PRIV ANY Give': '纸张：密电 任意 交付',
  'PAPERS: OUTP ANY Give': '纸张：输出 任意 交付',
  'ROTOR: Locked': '转子：锁定',
  'CABLE: Locked': '电缆：锁定',
  'SIGN: Locked': '签名：锁定',
  'APPRCODE: Locked': '批准码：锁定',
  '': '',
};

// ---- 处理函数 ----
function loadBlob(idx) {
  const p = `E:/FalseEcho_CN/extracted/blob_${idx}.json`;
  let t = fs.readFileSync(p, 'utf8');
  const nul = t.endsWith('\u0000');
  if (nul) t = t.slice(0, -1);
  return { data: JSON.parse(t), nul };
}

const results = {};
const stats = {};

// blob 2578 = Localization 主表
{
  const { data, nul } = loadBlob(2578);
  let n = 0, miss = 0;
  for (const pair of data) {
    const k = pair[0];
    if (main.has(k) && main.get(k) !== '') { pair[1] = main.get(k); n++; }
    else if (!main.has(k)) miss++;
  }
  stats.localization = `${n} 条已替换, ${miss} 条无译文(保留原文)`;
  results['2578'] = JSON.stringify(data) + (nul ? '\u0000' : '');
}

// blob 2575 = Endless
{
  const { data, nul } = loadBlob(2575);
  let n = 0, miss = 0;
  const skip = [];
  for (const pair of data) {
    const k = pair[0];
    if (endless.has(k)) { pair[1] = endless.get(k); n++; }
    else { miss++; skip.push(k); }
  }
  stats.endless = `${n} 条已替换, ${miss} 条保留英文(密文/校验目标)`;
  if (skip.length) fs.writeFileSync(path.join(OUT, 'endless_kept_en.txt'), skip.join('\n'), 'utf8');
  results['2575'] = JSON.stringify(data) + (nul ? '\u0000' : '');
}

// blob 2577 = 前线新闻
{
  const { data, nul } = loadBlob(2577);
  let n = 0, miss = 0;
  for (const pair of data) {
    const k = pair[0];
    if (war.has(k)) { pair[1] = war.get(k); n++; } else miss++;
  }
  stats.news = `${n} 条已替换, ${miss} 条保留原文`;
  results['2577'] = JSON.stringify(data) + (nul ? '\u0000' : '');
}

// blob 2579 = 战争日记
{
  const { data, nul } = loadBlob(2579);
  let n = 0, miss = 0;
  for (const pair of data) {
    const k = pair[0];
    if (war.has(k)) { pair[1] = war.get(k); n++; } else miss++;
  }
  stats.diary = `${n} 条已替换, ${miss} 条保留原文`;
  results['2579'] = JSON.stringify(data) + (nul ? '\u0000' : '');
}

// blob 2576 = 操作手册速查表
{
  const { data, nul } = loadBlob(2576);
  let n = 0, miss = 0;
  for (const row of data)
    for (let i = 0; i < row.length; i++) {
      if (MANUAL[row[i]] !== undefined) { if (row[i] !== MANUAL[row[i]]) n++; row[i] = MANUAL[row[i]]; }
      else if (row[i] !== '') { miss++; console.log('  手册未译: ' + JSON.stringify(row[i])); }
    }
  stats.manual = `${n} 处已替换, ${miss} 处未覆盖`;
  results['2576'] = JSON.stringify(data) + (nul ? '\u0000' : '');
}

fs.writeFileSync(path.join(OUT, 'blobs.json'), JSON.stringify(results), 'utf8');
for (const [k, v] of Object.entries(stats)) console.log(`blob ${k}: ${v}`);
console.log('blobs.json 已写出, ' + Object.keys(results).length + ' 个数据块');
