const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('apply/exe_spec.json', 'utf8'));
const needles = process.argv.slice(2);
const lits = spec.literals || [];
console.log('total literals', lits.length);
for (const l of lits) {
  const t = l.text || '';
  for (const n of needles) {
    if (t.indexOf(n) >= 0 || (l.key && l.key.indexOf(n) >= 0)) {
      console.log(JSON.stringify(l));
      break;
    }
  }
}
