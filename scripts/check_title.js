const fs = require('fs'), zlib = require('zlib');
const root = 'E:/FalseEcho_CN';
const blobs = JSON.parse(fs.readFileSync(root + '/apply/blobs.json', 'utf8'));
const s = String(blobs['2578']);
console.log('apply/blobs.json has CN title :', s.includes('按任意键开始'));
const i1 = s.indexOf('txt_mm_press_any_key_start');
console.log('  ctx:', JSON.stringify(s.slice(i1 - 12, i1 + 60)));

const b64map = JSON.parse(fs.readFileSync(root + '/patcher/payload/blobs_b64.json', 'utf8'));
const dec = zlib.inflateSync(Buffer.from(b64map['2578'], 'base64')).toString('utf8');
console.log('exe payload has CN title :', dec.includes('按任意键开始'));
const i2 = dec.indexOf('txt_mm_press_any_key_start');
console.log('  ctx:', JSON.stringify(dec.slice(i2 - 12, i2 + 60)));

const ts = fs.readFileSync(root + '/extracted/strings.tsv', 'utf8').replace(/^\uFEFF/, '');
let orig = null;
for (const line of ts.split('\n')) {
  const k = line.indexOf('\t');
  const mm = /^\[(\d+)\]$/.exec(line.slice(0, k));
  if (mm && +mm[1] === 2578) { orig = line.slice(k + 1).trim(); break; }
}
const od = zlib.inflateSync(Buffer.from(orig, 'base64')).toString('utf8');
const i3 = od.indexOf('txt_mm_press_any_key_start');
console.log('ORIGINAL payload ctx:', JSON.stringify(od.slice(i3 - 12, i3 + 60)));

// 已构建 exe 里实际存在的 base64 是否含中文
const exe = fs.readFileSync(root + '/out/FalseEcho_cn10.exe');
const hit = exe.indexOf(Buffer.from(b64map['2578'], 'latin1'));
console.log('built exe: blob2578 payload found at', hit >= 0 ? '0x' + hit.toString(16) : 'NOT FOUND');
if (hit >= 0) {
  const back = zlib.inflateSync(Buffer.from(exe.toString('latin1', hit, hit + b64map['2578'].length), 'base64')).toString('utf8');
  console.log('  built exe payload has CN title :', back.includes('按任意键开始'));
}
