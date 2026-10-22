// 针对几个已知棘手样本的单测
const path = require('path');
const src = require('fs').readFileSync('E:/FalseEcho_CN/scripts/break_long.js', 'utf8');
// 复用 break_long 的函数：把脚本尾部的主流程剥掉后 eval
const body = src.replace(/\/\/ -+ 主流程[\s\S]*$/, '');
const mod = { exports: {} };
const fn = new Function('module', 'exports', 'require', '__dirname', body + '\nmodule.exports={transform,breakLine,uOf,tokenize,packUnits};');
fn(mod, mod.exports, require, 'E:/FalseEcho_CN/scripts');
const { transform, uOf } = mod.exports;

const cases = [
  '仅当所有生效的验证项均为真时为 TRUE，否则为 FALSE',
  '仅当发信ID与日期同时为真时为 TRUE，否则为 FALSE',
  '日期必须为当日，除非发信人为 txt_verm_sender_inb_03，该发信人可使用可信的迟延日期且仍计为真',
  '欢迎来到无尽模式。你的主要目标是在尽量少出错的前提下，处理尽可能多的消息。',
  '任何时候你都可以按 ESC 并点击「结束班次」来停止游戏，结算你目前已获得的一切。',
  '「通告：所有人员立即到甲板集合。」他说。',
  '本次未发布单独的密件通报。仅向全体船员复述公开通报。不得讨论未经证实的损失、航线或作战命令。',
  '本次未发布单独的密件通报。\r\n仅向全体船员复述公开通报。\r\n不得讨论未经证实的损失、\r\n航线或作战命令。',
];
for (const c of cases) {
  const out = transform(c, '');
  console.log('IN  (' + uOf(c) + '): ' + JSON.stringify(c));
  console.log('OUT:');
  for (const L of out.split('\r\n')) console.log('     [' + uOf(L) + '] ' + JSON.stringify(L));
  console.log('');
}
