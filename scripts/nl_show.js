// 打印指定块某行的 EN / CN 对照
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
function rd(f) { let s = fs.readFileSync(f, 'utf8').replace(/\0/g, ''); return JSON.parse(s.replace(/\0+$/, '')); }
const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));
const id = process.argv[2];
const only = process.argv[3];
const en = rd(path.join(D, 'decoded', 'b' + id + '.txt'));
const cn = JSON.parse(raw[id].replace(/\0+$/, ''));
for (let i = 0; i < cn.length; i++) {
  const r = cn[i];
  if (!Array.isArray(r) || r.length < 2 || typeof r[1] !== 'string') continue;
  if (only && String(r[0]) !== only) continue;
  const e = (Array.isArray(en[i]) && typeof en[i][1] === 'string') ? en[i][1] : '';
  const eC = e.split(/\r\n|\r|\n/).filter(s => s.length);
  const cC = r[1].split(/\\r\\n|\\n|\r\n|\r|\n/).filter(s => s.length && s !== '\\r\\n' && s !== '\\n');
  console.log(`row ${i} key=${r[0]} enContent=${eC.length} cnContent=${cC.length}`);
  console.log('  EN: ' + JSON.stringify(e).slice(0, 400));
  console.log('  CN: ' + JSON.stringify(r[1]).slice(0, 400));
}
