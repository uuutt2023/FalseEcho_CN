// list_owner.js —— 列出字符串池中某个 owner 的全部字符串（按偏移），并标注是否已汉化
const fs = require('fs');
const { loadPool } = require('./exepool.js');
const root = 'E:/FalseEcho_CN';
const file = process.argv[2] || (root + '/backup_newbuild/False Echo.exe');
const owner = process.argv[3] || 'scr_do_orders_layout';
const map = JSON.parse(fs.readFileSync(root + '/trans/literal_map.json', 'utf8'));
const mapKeys = new Set(Object.keys(map));
const items = loadPool(file).items.filter(it => it.owner === owner).sort((a, b) => a.off - b.off);
let untranslated = 0;
for (const it of items) {
  const cn = mapKeys.has(it.s);
  if (!cn) untranslated++;
  console.log((cn ? '  [CN] ' : '  [EN] ') + '0x' + it.off.toString(16) + '  ' + JSON.stringify(it.s.length > 110 ? it.s.slice(0, 110) + '...' : it.s));
}
console.log('total', items.length, 'untranslated', untranslated);
