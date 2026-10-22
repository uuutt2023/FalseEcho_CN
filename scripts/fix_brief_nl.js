// 给 exe 字面量中的「自动换行长句」补上显式换行（真实 CRLF）
// 依据：游戏按空格自动换行，中文无空格 → 整段挤成一行溢出
// 简报文本框宽约 155~171 game px，正文 CJK advance=10 game px → 每行 ≤16 字
const fs = require('fs');

// [EN 原文, [各行中文]]  —— 行内首尾不保留空格（换行处空格不可见）
const FIX = [
  [
    'A hard blow to the head and blurred vision. Now I must relearn what I should already know.',
    ['头部遭受重击，视线模糊。现在我', '必须重新学会本该早已掌握的东西。']
  ],
  [
    'Of course the operation has gone wrong. Sub 96 has gone missing. We must find some way to establish contact.',
    ['行动果然出了问题。Sub 96 失踪了。', '我们必须想办法建立联系。']
  ],
  [
    'A major naval operation is underway, with Sub 96 leading the way. We have been assigned a secondary role, far from the main action.',
    ['一场重大海军行动正在进行，由', 'Sub 96 打头阵。我们被指派了', '次要角色，远离主战场。']
  ],
];

const squash = s => s.replace(/\s/g, '');
const mapPath = 'trans/literal_map.json';
const specPath = 'apply/exe_spec.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

let nMap = 0, nSpec = 0;
for (const [en, lines] of FIX) {
  const joined = lines.join('\r\n');
  if (map[en] !== undefined) { map[en] = joined; nMap++; }
  else console.log('!! literal_map 缺少 EN: ' + en.slice(0, 50));
  const want = squash(joined);
  let hit = 0;
  for (const l of spec.literals || []) {
    if (squash(l.text) === want) { l.text = joined; hit++; nSpec++; }
  }
  if (!hit) console.log('!! exe_spec 未匹配: ' + en.slice(0, 50));
}
fs.writeFileSync(mapPath, JSON.stringify(map, null, ' '), 'utf8');
fs.writeFileSync(specPath, JSON.stringify(spec, null, ' '), 'utf8');
console.log(`literal_map 更新 ${nMap} 条, exe_spec 更新 ${nSpec} 条`);
for (const [en, lines] of FIX) console.log('  -> ' + lines.map(l => l.length).join(' / ') + ' 字/行');
