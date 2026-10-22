const fs = require('fs');
const m = JSON.parse(fs.readFileSync('trans/literal_map.json', 'utf8'));
const re = new RegExp(process.argv[2], 'i');
for (const k of Object.keys(m)) {
  if (re.test(k)) console.log(JSON.stringify(k) + '  =>  ' + JSON.stringify(m[k]));
}
