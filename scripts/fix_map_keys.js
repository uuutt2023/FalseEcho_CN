// Repair the map keys that must match the exe pool byte-for-byte:
// the key is taken from the pool itself, so it always matches.
const fs = require('fs');
const path = require('path');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';

const mapPath = path.join(root, 'trans', 'literal_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const { items } = loadPool(path.join(root, 'backup_original', 'False Echo.exe'));
const pool = new Set(items.map(i => i.s));

// probe (prefix that identifies the entry) -> preferred pool text
const FIXUPS = [
  { probe: 'Earlier dates allowed from', cn: ' 允许的更早日期来自 ' },
  { probe: 'One wrong, then', cn: '一项错误，则随机。' },
  {
    probe: 'Every message consists of INPUT and OUTPUT paper',
    cn: '每条消息都由输入纸与输出纸组成。输入纸必须始终盖上回响印章。输出纸则视任务类型需要盖不同的印章或签名；输出纸从你左手边的两个抽屉中取用。\n\n若消息不真实：盖上伪回响印章并立即交还。若消息属实：盖上真回响印章，处理该消息，将输入纸与输出纸一起别好并交还。',
  },
  {
    probe: 'For minor infractions you will receive citations',
    cn: '轻微违规会收到训诫书。你必须把每张训诫书带到桌前并用碎纸机销毁后才能继续。严重违规或训诫书过多将导致军事法庭审判。\n\n每个错误字母扣除 ',
  },
  {
    probe: 'Thank you for playing the False Echo demo',
    cn: '感谢游玩《虚妄回响》Demo。\n\n这只是航程的第一部分。完整版将继续剩余的日程、新的任务，以及你所作决定带来的后果。\n\n如果你有反馈、Bug 报告或想法，欢迎通过 Discord 或我们的社交渠道联系我们。你的评价与愿望单能让这段完整的航程得以成真。',
  },
];

for (const f of FIXUPS) {
  // remove every map entry that starts with the probe
  const olds = Object.keys(map).filter(k => k.startsWith(f.probe));
  const cands = [...pool].filter(p => p.startsWith(f.probe));
  if (!cands.length) { console.log(`!! ${f.probe}: no pool candidate`); continue; }
  // pick the longest pool candidate (the full text)
  const best = cands.sort((a, b) => b.length - a.length)[0];
  for (const o of olds) {
    const cn = map[o];
    delete map[o];
    console.log(`  replaced key len=${o.length} -> len=${best.length}`);
    map[best] = (o === best) ? cn : f.cn;
  }
  if (!olds.length) map[best] = f.cn;
}
fs.writeFileSync(mapPath, JSON.stringify(map, null, 1), 'utf8');

// final validation
const bad = Object.keys(map).filter(k => !pool.has(k));
console.log(`\nmap entries: ${Object.keys(map).length}, keys not in pool: ${bad.length}`);
for (const b of bad) console.log(`   STILL MISSING ${JSON.stringify(b.slice(0, 70))}`);
