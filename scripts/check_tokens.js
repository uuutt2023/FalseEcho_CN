const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('E:/FalseEcho_CN/apply/exe_spec.json', 'utf8'));
const map = JSON.parse(fs.readFileSync('E:/FalseEcho_CN/trans/literal_map.json', 'utf8'));
const tokens = ['locale', 'idle', 'text', 'game', 'BACK', 'PLAYER', 'staple', 'CPTN', 'BLUE', 'NONE', 'bm_one', 'STATEMENT', 'Difficulty', 'SIGNATURES', 'GAME PAUSED', 'CONFIDENTIAL NEWS', 'NEWS FROM THE FRONT', 'Check Sender and Receiver fields!', 'Process the paper', 'Sign the statement', 'PICK THE MESSAGES'];
console.log('=== 技术标识符是否被误译 ===');
for (const t of tokens) {
  const v = map[t];
  console.log(`  ${JSON.stringify(t).padEnd(42)} => ${v === undefined ? '(未翻译)' : JSON.stringify(v)}`);
}
console.log('\n=== spec 中这些 token 的条目 ===');
for (const l of spec.literals) {
  if (tokens.includes(l.text) || tokens.includes(String(l.newText))) console.log('  ' + JSON.stringify(l));
}
