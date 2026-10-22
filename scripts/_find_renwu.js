const fs = require('fs');
const needle = '任务';
const files = process.argv.slice(2);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = new RegExp('"([^"\\n]*' + needle + '[^"\\n]*)"', 'g');
  let m, n = 0;
  const seen = new Set();
  while ((m = re.exec(s)) && n < 40) {
    if (!seen.has(m[1])) { seen.add(m[1]); console.log(f + ' | ' + m[1]); n++; }
  }
}
