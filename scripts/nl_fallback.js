// 查看退路条目（2575/2577/2579）的 EN/CN 分段情况
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const LIT = '\\n';

function readJsonText(f) {
  let s = fs.readFileSync(f, 'utf8').replace(/\0/g, '');
  return JSON.parse(s.replace(/\0+$/, ''));
}
const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));

for (const id of ['2575', '2577', '2579']) {
  const en = readJsonText(path.join(D, 'decoded', 'b' + id + '.txt'));
  const cn = JSON.parse(raw[id].replace(/\0+$/, ''));
  console.log('===== block ' + id + ' =====');
  for (let i = 0; i < cn.length; i++) {
    const row = cn[i];
    if (!Array.isArray(row) || row.length < 2 || typeof row[1] !== 'string') continue;
    const v = row[1];
    const e = (Array.isArray(en[i]) && typeof en[i][1] === 'string') ? en[i][1] : '';
    const enContent = e.split(/\r\n|\r|\n/).filter(s => s.length > 0);
    const cnContent = v.split(/(\\n|\r\n|\r|\n)/).filter(s => s.length > 0);
    if (enContent.length !== cnContent.length) {
      console.log(`  row ${i} key=${row[0]}  enContent=${enContent.length} cnContent=${cnContent.length}`);
      console.log('    EN: ' + JSON.stringify(e).slice(0, 320));
      console.log('    CN: ' + JSON.stringify(v).slice(0, 320));
    }
  }
}
