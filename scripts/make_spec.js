// Build the exe patch spec from apply/blobs.json + trans/literal_cn.tsv
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
const spec = { blobs: {}, literals: [] };

for (const k of Object.keys(blobs)) spec.blobs[k] = blobs[k];

const litFile = path.join(root, 'trans', 'literal_cn.tsv');
if (fs.existsSync(litFile)) {
  const lines = fs.readFileSync(litFile, 'utf8').replace(/^\uFEFF/, '').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const p = line.split('\t');
    if (p.length < 2) continue;
    const off = parseInt(p[0], 10);
    if (!Number.isFinite(off)) { console.log('skip bad line:', JSON.stringify(line.slice(0, 60))); continue; }
    let text = p.slice(1).join('\t');
    // literal \n means a real newline
    text = text.replace(/\\n/g, '\n');
    if (p[2] === 'keep') continue;          // keep the original English
    spec.literals.push({ off, text });
  }
}

const outPath = process.argv[2] || path.join(root, 'apply', 'exe_spec.json');
fs.writeFileSync(outPath, JSON.stringify(spec, null, 1), 'utf8');
console.log(`blobs: ${Object.keys(spec.blobs).length}  literals: ${spec.literals.length}`);
console.log(`-> ${outPath}`);
