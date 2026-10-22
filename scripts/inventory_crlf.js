// inventory_crlf.js — 盘点各构建产物中含 CRLF 的字符串及其键名前缀
const fs = require('fs');
const path = require('path');

function walk(v, out, prefix) {
  if (typeof v === 'string') {
    if (v.indexOf('\r\n') >= 0) out.push([prefix, v]);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => {
      if (Array.isArray(x)) walk(x[1], out, prefix + '.' + x[0]);
      else walk(x, out, prefix + '[' + i + ']');
    });
  } else if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) walk(v[k], out, prefix ? prefix + '.' + k : k);
  }
}

const files = process.argv.slice(2);
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = [];
  walk(j, out, '');
  // 统计键名前缀（取前 2 段下划线）
  const groups = {};
  for (const [k, v] of out) {
    const key = k.split('.').pop();
    const g = key.replace(/[0-9_]+$/, '').replace(/_\d+$/, '');
    const n = v.split('\r\n').length;
    if (!groups[g]) groups[g] = { n: 0, lines: 0, sample: null };
    groups[g].n++;
    groups[g].lines += n;
    if (!groups[g].sample) groups[g].sample = v.slice(0, 60).replace(/\r\n/g, '\\n');
  }
  console.log('\n===== ' + f + '  (' + out.length + ' strings with CRLF) =====');
  const ents = Object.entries(groups).sort((a, b) => b[1].lines - a[1].lines);
  for (const [g, v] of ents) console.log(`  ${g.padEnd(26)} count=${String(v.n).padStart(4)} lines=${String(v.lines).padStart(4)}  ${v.sample}`);
}
