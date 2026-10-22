const fs = require('fs');
const m = JSON.parse(fs.readFileSync('trans/literal_map.json', 'utf8'));
const needles = process.argv.slice(2);
for (const k of Object.keys(m)) {
  for (const n of needles) {
    if (m[k].indexOf(n) >= 0) {
      console.log(JSON.stringify(k) + '  =>  ' + JSON.stringify(m[k]));
      break;
    }
  }
}
