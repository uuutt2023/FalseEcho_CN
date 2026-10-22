// 统计各 CN 块中各类换行转义形式的数量
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const raw = JSON.parse(fs.readFileSync(path.join(D, 'apply/blobs.json'), 'utf8').replace(/\0/g, ''));

function scan(v, counts) {
  if (typeof v === 'string') {
    for (let i = 0; i < v.length; i++) {
      const c = v[i];
      if (c === '\\') {
        const n = v[i + 1];
        if (n === 'n') { counts.litN++; i += 1; }
        else if (n === 'r') {
          if (v[i + 2] === '\\' && v[i + 3] === 'n') { counts.litCRLF++; i += 3; }
          else { counts.litCR++; i += 1; }
        } else { counts.litOther++; i += 1; }
      } else if (c === '\n') counts.realLF++;
      else if (c === '\r') counts.realCR++;
    }
  } else if (Array.isArray(v)) v.forEach((x) => scan(x, counts));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => scan(x, counts));
}

for (const id of Object.keys(raw)) {
  const cn = JSON.parse(raw[id].replace(/\0+$/, ''));
  const counts = { litN: 0, litCRLF: 0, litCR: 0, litOther: 0, realLF: 0, realCR: 0 };
  scan(cn, counts);
  console.log('block ' + id + ': ' + JSON.stringify(counts));
}
