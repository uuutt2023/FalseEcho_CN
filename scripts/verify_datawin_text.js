// verify_datawin_text.js —— 校验 data.win 内的 9 个烘焙块内容与 apply/blobs.json 一致
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = 'E:/FalseEcho_CN';

const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const target = process.argv[2] || path.join(root, 'out', 'data_cn2.win');
if (!fs.existsSync(target)) { console.error('data.win 不存在: ' + target); process.exit(2); }
console.log('校验目标: ' + target);

// 用 UMT 把 9 个 STRG 逐个导出为 base64 文本文件
const outDir = path.join(root, 'out', 'dw_dump');
fs.mkdirSync(outDir, { recursive: true });
const script = path.join(root, 'scripts', 'dump_strings.csx');
fs.writeFileSync(script, [
  'using System.IO;',
  'using System.Text;',
  'string outDir = @"' + outDir.replace(/\\/g, '\\\\') + '";',
  'int[] idx = new int[] { ' + (process.env.BLOB_IDS || '2561, 2566, 2568, 2574, 2575, 2576, 2577, 2578, 2579').split(',').join(', ') + ' };',
  'foreach (int i in idx) {',
  '    string p = System.IO.Path.Combine(outDir, i.ToString() + ".b64");',
  '    System.IO.File.WriteAllText(p, Data.Strings[i].Content, new UTF8Encoding(false));',
  '}',
  'Console.WriteLine("DUMPED " + idx.Length);',
  ''
].join('\n'));

execFileSync(path.join(root, 'tools', 'utmt', 'UndertaleModCli.exe'),
  ['load', target, '-s', script, '-o', path.join(outDir, 'x.win'), '-f'],
  { stdio: 'pipe', encoding: 'utf8' });

let bad = 0;
for (const k of Object.keys(blobs)) {
  const p = path.join(outDir, k + '.b64');
  if (!fs.existsSync(p)) { console.log(`  blob ${k}: data.win 中缺失`); bad++; continue; }
  const b64 = fs.readFileSync(p, 'utf8').replace(/\0/g, '').trim();
  let plain;
  try { plain = zlib.inflateSync(Buffer.from(b64, 'base64')).toString('utf8'); }
  catch (e) { console.log(`  blob ${k}: 解压失败 ${e.message}`); bad++; continue; }
  if (plain === blobs[k]) { console.log(`  blob ${k}: 一致 (${plain.length} 字符)`); continue; }
  bad++;
  console.log(`  blob ${k}: 不一致 (data.win=${plain.length} spec=${blobs[k].length})`);
  for (let i = 0; i < Math.min(plain.length, blobs[k].length); i++) {
    if (plain[i] !== blobs[k][i]) {
      console.log(`    首个差异 @${i}`);
      console.log(`      data.win=${JSON.stringify(plain.slice(Math.max(0, i - 30), i + 30))}`);
      console.log(`      spec    =${JSON.stringify(blobs[k].slice(Math.max(0, i - 30), i + 30))}`);
      break;
    }
  }
}
console.log(bad === 0 ? '\nDATA.WIN TEXT OK - 9 块全部一致' : `\n${bad} 块不一致`);
process.exit(bad === 0 ? 0 : 1);
