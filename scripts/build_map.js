// Build the final trans/literal_map.json:
//   * fix the 5 entries that did not match the exe pool verbatim
//   * reuse the baked-table CN translation for every pool literal that equals
//     a table VALUE (keeps table and code path text identical -> comparisons
//     that reference the table still work)
//   * add the newly discovered display strings
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const mapPath = path.join(root, 'trans', 'literal_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const en2cn = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'table_en2cn.json'), 'utf8'));

// ---------------------------------------------------------------- 1. fixes
const FIX = {
  // pool text has a LEADING space
  'Earlier dates allowed from ': ' 允许的更早日期来自 ',
  // pool text differs from the table text -> use the pool wording
  'Every message consists of INPUT and OUTPUT paper. INPUT PAPER must ALWAYS be stamped with ECHO STAMPER. Output paper requires different stamps or signatures, depending on the mission type. Output papers are pulled from two drawers on your left.\n\nIf a message is not authentic: stamp it FALSE ECHO and give it back right away. If a message is authentic, stamp TRUE ECHO, process the message, clip input and output together and give them back.':
    '每条消息都由输入纸与输出纸组成。输入纸必须始终盖上回响印章。输出纸则视任务类型需要盖不同的印章或签名；输出纸从你左手边的两个抽屉中取用。\n\n若消息不真实：盖上伪回响印章并立即交还。若消息属实：盖上真回响印章，处理该消息，将输入纸与输出纸一起别好并交还。',
  'For minor infractions you will receive citations. You must bring each citation to the table and shred it before progressing. Major infractions or too many citations will result in a court-martial.\n\nEach incorrect letter deducts ':
    '轻微违规会收到训诫书。你必须把每张训诫书带到桌前并用碎纸机销毁后才能继续。严重违规或训诫书过多将导致军事法庭审判。\n\n每个错误字母扣除 ',
  'Thank you for playing the False Echo demo.\n\nThis is only the first part of the voyage. The full game will continue with the remaining days, new missions, and the consequences of your decisions.\n\nIf you have feedback, bug reports, or thoughts, please reach us through Discord or our social channels. Your reviews and wishlists help bring the full voyage to life.':
    '感谢游玩《虚妄回响》Demo。\n\n这只是航程的第一部分。完整版将继续剩余的日程、新的任务，以及你所作决定带来的后果。\n\n如果你有反馈、Bug 报告或想法，欢迎通过 Discord 或我们的社交渠道联系我们。你的评价与愿望单能让这段完整的航程得以成真。',
  'One wrong, then the random.': '一项错误，则随机。',
};
// remove the stale (old-wording) keys
const STALE = [
  'Earlier dates allowed from ',
  'Every message consists of INPUT and OUTPUT paper. INPUT PAPER must ALWAYS be stamped with ECHO STAMPER. Output paper may also need to be signed by the Captain.',
  'For minor infractions you will receive citations. You must bring each citation to the table and shred it before progressing. Major infractions or too many citations will result in a court-martial.\n\nEach citation is a page that must be destroyed at the paper shredder. You can carry only a few at a time.',
  'Thank you for playing the False Echo demo.\n\nThis is only the first part of the voyage. The full game will continue with the remaining days, new missions, and the consequences of your decisions.\n\nIf you enjoyed this demo, consider adding False Echo to your wishlist.',
  'One wrong, then the random.',
];
for (const k of STALE) {
  if (k in map) { delete map[k]; console.log(`removed stale key ${JSON.stringify(k.slice(0, 60))}`); }
}
Object.assign(map, FIX);

// ---------------------------------------------------------------- 2. table sync
let synced = 0;
const diffs = [];
for (const [en, cn] of Object.entries(map)) {
  const t = en2cn[en];
  if (!t) continue;
  if (t !== cn) { diffs.push([en, cn, t]); }
  map[en] = t;
  synced++;
}
console.log(`table-synced entries: ${synced}, of which wording differs: ${diffs.length}`);
for (const [en, a, b] of diffs) {
  console.log(`  EN ${JSON.stringify(en.slice(0, 60))}`);
  console.log(`     old ${JSON.stringify(a)}`);
  console.log(`     new ${JSON.stringify(b)}`);
}

// ---------------------------------------------------------------- 3. new entries
const NEW = {
  'OPPRESSIA': '奥普雷西亚',
  'TO VICTORY': '必胜！',
  'BURN': '焚毁',
  'WAIT': '暂缓',
  'Sub 227': '《虚妄回响》',
  'OPEN': '打开',
  'GAS MASK CONTAINER': '防毒面具箱',
  'TELEPRINTER COPY': '电传打字机副本',
  'TELEPRINTER MESSAGE': '电传电文',
  'TELEPRINTER PAPER': '电传纸',
  'DECODING OUTPUT': '解码输出',
  'ENCODING OUTPUT': '编码输出',
  'VER SLIP': '核验单',
  'DECODED': '已解码',
  ' HIDDEN': ' 隐藏',
  ' BACK': ' 返回',
  'REGULAR STAMPS': '常规印章',
  'DECODING MESSAGE OUTPUT': '解码电文输出',
  'ENCODING MESSAGE OUTPUT': '编码电文输出',
  'ENCODING MESSAGE INPUT': '编码电文输入',
  'DECODING MESSAGE INPUT': '解码电文输入',
  'WISHLIST': '愿望单',
  'NAVAL COMMAND': '海军司令部',
  'To: Lieutenant,': '致：中尉，',
  'STATUS UNCONFIRMED': '状态未确认',
  'WISHLIST REQUEST': '愿望单申请',
  'SUPPORT ACKNOWLEDGED': '已收到支持',
  'MISSING BIO': '暂无简介',
  'APPROVED': '已批准',
  'INBOUND': '收讯',
  'CLASSIFIED': '机密',
  'END SHIFT': '换更结束',
  'GAME PAUSED': '游戏已暂停',
  'TRANSCRIPT': '记录稿',
  'NO TRANSCRIPT AVAILABLE': '暂无记录稿',
  'DECODING MISSION': '解码任务',
  'ROTORS ': '转子 ',
  "I DON'T HAVE A KEY FOR THIS": '我没有这个的钥匙',
  'Wipe the stains.': '把血迹擦掉。',
  'Unclip the papers before archiving.': '归档前请先取下别针。',
  'Show this tutorial on Endless start.': '开始无尽模式时显示本教程。',
  'Close the drawer first': '请先关上抽屉',
  'Close the paper cover first': '请先合上纸盖',
  'Paper discarded: output attempt cleared and input markers reset.': '纸张已丢弃：已清除输出尝试并重置输入标记。',
  'Enigma session reset after discarded output paper.': '丢弃输出纸后已重置恩尼格玛会话。',
  'Input paper markers cleared after output discard.': '丢弃输出纸后已清除输入纸标记。',
  'Alright, prepare for landing.': '好了，准备降落。',
  'Less than a minute, Captain!': '不到一分钟了，艇长！',
  'Navigator, how much further to the rendezvous point?': '领航员，离会合点还有多远？',
  'Now where the hell are they?': '他们到底在哪儿？',
  'The demo is only the beginning. Naval Command requests your support for the voyage ahead.': 'Demo 只是一切的开始。海军司令部请求你支持接下来的航程。',
  'Help us bring the full voyage to life.\nOppressia is counting on you.': '帮助我们让完整的航程成真。\n奥普雷西亚在等着你。',
  'Our records are incomplete. Your time aboard Sub 227 has not gone unnoticed.': '我们的记录并不完整。你在 227 号潜艇上度过的时光，我们并非没有察觉。',
  'Your support has reached Naval Command. Preparations for the full voyage are underway.': '你的支持已送达海军司令部。完整航程的准备工作正在进行。',
  'Oppressia appreciates your support.\nCarry on.': '奥普雷西亚感谢你的支持。\n继续前进吧。',
  'Add ': '把',
  ' to your Steam wishlist.': '加入你的 Steam 愿望单。',
  'If you have already wishlisted ': '如果你已经支持了',
  ', thank you.': '，谢谢。',
  'Thank you for wishlisting ': '感谢你支持',
  'STASEC was unable to determine whether you have wishlisted ': '国家安全委无法确定你是否已经支持了',
};
let added = 0, overwritten = 0;
for (const [en, cn] of Object.entries(NEW)) {
  if (en in map) { overwritten++; console.log(`  OVERWRITE ${JSON.stringify(en)}`); }
  else added++;
  map[en] = cn;
}
console.log(`\nnew entries: ${added}, overwritten: ${overwritten}`);
console.log(`total map entries: ${Object.keys(map).length}`);
fs.writeFileSync(mapPath, JSON.stringify(map, null, 1), 'utf8');
console.log('-> ' + mapPath);
