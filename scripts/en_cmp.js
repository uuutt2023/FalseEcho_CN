// en_cmp.js <blobId> <key...> — 对比英文原表 / 断行前 / 当前 的换行结构
const fs = require('fs');
function parseFile(p) { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/\0+$/, '')); }
function parseBlock(s) {
  if (Array.isArray(s)) return s;
  const t = s.replace(/\0+$/, '');
  try { return JSON.parse(t); } catch (e) { return JSON.parse(t.slice(0, t.lastIndexOf(']') + 1)); }
}
const bid = process.argv[2];
const en = parseBlock(parseFile('extracted/blob_' + bid + '.json'));
const pre = parseBlock(parseFile('backup_prebreak/blobs.json.bak')[bid]);
const cur = parseBlock(parseFile('apply/blobs.json')[bid]);
const em = new Map(en.map(p => [p[0], p[1]]));
const pm = new Map(pre.map(p => [p[0], p[1]]));
for (const k of process.argv.slice(3)) {
  const e = em.get(k), p = pm.get(k), c = (cur.find(x => x[0] === k) || [])[1];
  const nl = v => (v === undefined ? 'MISSING' : JSON.stringify(v).match(/\\n/g)?.length || 0);
  console.log(`--- ${k}\n  EN  nl=${nl(e)}  ${JSON.stringify(e).slice(0, 150)}\n  PRE nl=${nl(p)}  ${JSON.stringify(p).slice(0, 150)}\n  CUR nl=${nl(c)}  ${JSON.stringify(c).slice(0, 150)}`);
}
