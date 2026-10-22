// build_charset.js —— 生成最终字体字符集
//   = 原有 charset.txt ∪ 所有已安装中文文本用到的字符 ∪ 安全余量
// 输出：每行一个字符，UTF-8，无 BOM，LF
const fs = require('fs');
const path = require('path');
const root = 'E:/FalseEcho_CN';

const outFile = path.join(root, 'trans', 'charset.txt');
const ordered = [];
const seen = new Set();
function add(ch) {
  if (ch === undefined || ch === null) return;
  if (ch.codePointAt(0) <= 127) return;   // ASCII 由原字体自带
  if (seen.has(ch)) return;
  seen.add(ch); ordered.push(ch);
}

// 1) 原有字符集保持原顺序
const old = fs.readFileSync(outFile, 'utf8').replace(/[\u0000]/g, '');
for (const ch of old) add(ch);
console.log(`原有字符集: ${ordered.length}`);

// 2) 所有已安装中文文本用到的字符
const srcs = [];
const blobs = JSON.parse(fs.readFileSync(path.join(root, 'apply', 'blobs.json'), 'utf8'));
for (const [id, text] of Object.entries(blobs)) srcs.push([`blob ${id}`, text]);
const map = JSON.parse(fs.readFileSync(path.join(root, 'trans', 'literal_map.json'), 'utf8'));
for (const [en, cn] of Object.entries(map)) srcs.push(['literal', cn]);
const TR = require(path.join(root, 'trans', 'mission_blob_cn.js'));
for (const id of Object.keys(TR)) for (const [en, cn] of Object.entries(TR[id])) srcs.push([`mission ${id}`, cn]);

const addedSet = [];
for (const [, text] of srcs) {
  if (typeof text !== 'string') continue;
  for (const ch of text) {
    if (ch.codePointAt(0) <= 127) continue;
    if (seen.has(ch)) continue;
    seen.add(ch); ordered.push(ch); addedSet.push(ch);
  }
}
console.log(`文本新增: ${addedSet.length} 个 -> ${addedSet.join('')}`);

// 3) 安全余量：CJK 标点 + 常用简体汉字（防止后续补字再次缺字形）
const MARGIN = [
  // 全角标点 / 常用符号
  '　！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～',
  '·×÷±°％‰′″§¶©®™←→↑↓※☆★○●◎◇◆□■△▲▽▼',
  // 常用汉字（按大致常用度）
  '的一是了我不人在他有这个上们来到时大地为子中你说生国年着就那和要她出也得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感见明问力理尔点文几定本公特做外孩相西果走将月十实向声车全信重三机工物气每并别真打太新比才便夫再书部水像眼等体却加电主界门利海受听表德少克代员许稜先口由死安写性马光白或住难望教命花结乐色更拉东神记处让母父应直字场平报友关放至张认接告入笑内英军候民岁往何度山觉路带万男边风解叫任金快原吃妈变通师立象数四失满战远格士音轻目条呢病始达深完今提求清王化空业思切怎非找片罗钱紶吗语元喜曾离飞科言干流欢约各即指合反题必该论交终林请医晚制球决窢传画保读运及则房早院量苦火布品近坐产答星精视五连司巴奇管类未朋且婚台夜青北队久乎越观落尽形影红爸百令周吧识步希亚术留市半热送兴造谈容极随演收首根讲整式取照办强石古华諣拿计您装似足双妻尼转诉米称丽客南领节衣站黑刻统断福城故历惊脸选包紧争另建维绝树系伤示愿持千史谁准联妇纪基买志静阿诗独复痛消社算义竟确酒需单治卡幸兰念举仅钟怕共毛句息功官待究跟穿室易游程号居考突皮哪费倒价图具刚脑永歌响商礼细专黄块脚味灵改据般承困冒皮草技备饭班密规佳注命卷联却席松秘谢欲紧植村客模错映朝告炎盟反掌伤版那伯香停顾五变件价利至术周支信轻命许命',
  // 数字/单位/常见外来词用字
  '零一二三四五六七八九十百千万亿兆第数批层台套号秒分时天周月年日期号室层楼级站',
].join('');

let mAdded = 0;
for (const ch of MARGIN) {
  if (ch.codePointAt(0) <= 127) continue;
  if (seen.has(ch)) continue;
  seen.add(ch); ordered.push(ch); mAdded++;
}
console.log(`安全余量新增: ${mAdded} 个`);

fs.writeFileSync(outFile, ordered.join('\n') + '\n', 'utf8');
console.log(`最终字符集: ${ordered.length} 个字符 -> ${outFile}`);
