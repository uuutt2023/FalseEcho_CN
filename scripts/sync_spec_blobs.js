// sync_spec_blobs.js —— 把 apply/blobs.json 的最新内容同步进 apply/exe_spec.json
// （译文订正后必须重跑，否则 exe 里的烘焙块仍是旧译文）
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const specPath = path.join(root, 'apply', 'exe_spec.json');
const blobsPath = path.join(root, 'apply', 'blobs.json');

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const blobs = JSON.parse(fs.readFileSync(blobsPath, 'utf8'));

let changed = 0;
for (const k of Object.keys(blobs)) {
  if (spec.blobs[k] !== blobs[k]) {
    console.log(`  blob ${k}: 更新 ${String(spec.blobs[k] || '').length} -> ${blobs[k].length} 字符`);
    spec.blobs[k] = blobs[k];
    changed++;
  }
}
// 删除 spec 中已不存在的 blob 键
for (const k of Object.keys(spec.blobs)) {
  if (!(k in blobs)) { console.log(`  blob ${k}: 从 spec 中移除`); delete spec.blobs[k]; changed++; }
}

fs.writeFileSync(specPath, JSON.stringify(spec, null, 1), 'utf8');
console.log(`同步 ${changed} 个块 -> ${specPath} (blobs ${Object.keys(spec.blobs).length}, literals ${spec.literals.length})`);
