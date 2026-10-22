const path = require('path');
const { loadPool } = require('./exepool.js');
const { items } = loadPool('E:/FalseEcho_CN/backup_original/False Echo.exe');
const want = process.argv.slice(2);
for (const it of items) {
  if (want.includes(it.s)) {
    console.log(`off=${it.off} (0x${it.off.toString(16)})  s=${JSON.stringify(it.s)}  owner=${it.owner}`);
  }
}
