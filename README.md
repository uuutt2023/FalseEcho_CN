# FalseEcho_CN —— 《虚妄回响 / False Echo》简体中文本地化补丁

面向 Steam 版 **False Echo Demo**（AppID `5072320`，当前适配 **v0.9.8.6**）的完整简体中文本地化工程。

> 游戏画面、美术、音频与原始文本的著作权归开发者 / 发行商所有。
> 本仓库**不包含**任何游戏本体文件、反编译源码或原始资源，只包含本项目自行产出的
> **译文、中文字形、补丁脚本与构建工具源码**。使用者需自行拥有正版游戏。

---

## 一、这是什么

GameMaker（YYC 编译版）把界面与剧情文本以 `base64 + zlib` 烘焙在 **exe 内部的自定义字符串池**里，
而 `data.win` 只承载字体等资源。因此汉化要同时改两个文件：

| 文件 | 改什么 | 怎么改 |
|---|---|---|
| `False Echo.exe` | 9 个烘焙文本块 + 448 条界面/剧情字面量 | 中文更短 → 原位改写（严格限制在原串字节内）；更长 → 搬进 exe 新增的 `.cndata` 节，并把 `.text` 中的 RIP 相对引用重新指向新位置 |
| `data.win` | 9 个文本块 + 12 款字体的中文字形 | 用 UndertaleModLib 打开**玩家本机**的原版 `data.win`，替换文本块、加入 3 张中文字形图集、重定向字形表并按中文墨迹抬升行高 |

## 二、给玩家的用法（不需要任何环境）

### 下载

从本仓库的 [Releases](https://github.com/uuutt2023/FalseEcho_CN/releases) 下载补丁包
（`FalseEcho-CN-Patch-v0986.zip`，约 63 MB），解压后按下面三步安装即可。

### 安装

1. 在 Steam 安装并启动过一次游戏；
2. 把 `patcher/` 整个文件夹复制到**游戏根目录**（即同时含有 `False Echo.exe` 与 `data.win` 的文件夹）；
3. 双击 `Install-CN.cmd`；
4. 看到「简体中文补丁安装完成！」后从 Steam 正常启动游戏。

想还原原版：双击 `Restore-CN.cmd`。

补丁器做了三件安全事：**指纹不符直接拒绝安装**（游戏更新后不会被打坏）、**首次安装自动备份原版**、
**重复运行自动识别并跳过**。

## 三、目录说明

```
patcher/            玩家用的注入补丁器
  Install-CN.cmd / Restore-CN.cmd
  Patch-FalseEcho-CN.ps1    主脚本（-Action install|restore|verify）
  使用说明.txt
  payload/           汉化数据：中文文本块、字面量表、补丁计划、字体图集与计划
  tools/README.md    关于内置运行时（第三方二进制未随仓库分发）的说明
scripts/             构建与逆向脚本
  break_v2.js        断行算法（按英文原行宽预算分词）
  exe_patch.js       exe 字符串池补丁（等长原位 / 搬迁到 .cndata 节）
  apply_all.csx      data.win 文本块 + 字形写入（UMT 脚本）
  build_literals.js  由译文表生成 exe 字面量补丁清单
  make_payload.js / make_relocs.js   生成玩家补丁载荷
  migrate_newbuild.js               游戏版本升级适配（块下标重映射 + 增量补译）
  verify_*.js / break_invariant2.js  三重校验与断行不变量校验
trans/               译文主表与术语
  literal_map.json   EN → CN 主表（exe 字面量）
  table_en2cn.json   文本块（表）EN → CN
  mission_blob_cn.*  任务/剧情数据译文
  charset.txt        中文字符集（1786 字）
apply/               构建中间件：blobs.json（9 个中文文本块）、exe_spec.json
fontout_cn6/         中文字形图集（3 × 2048²）与 fontplan.json
tool/ gmltool/ fonttool/   自研工具源码（字体生成、GML 反编译、数据提取）
```

## 四、已实现的汉化内容

- 全量界面与剧情文本；纸面电传、每日命令、船员名册、战争日记、前线新闻、证言书 / 器材接收单、
  暗影机手册、任务简报、证件页、Endless 模式说明等全部中文化；
- 12 款字体重绘中文字形（1786 汉字），行高按中文墨迹高度自适应；
- 密文、校验键、`expected` 输入目标等需要与原版逐字节一致的字符串按规则保留原文。

## 五、断行算法（中文不折行的关键）

游戏所有文本渲染器都按**空格**分词自动折行，英文因此总能正确换行，中文没有空格就会溢出。
本工程的处理：

- 英文原串自带换行 → 原样保留（段落 / 表格行结构不动）；
- 中文行宽 ≤ 16 单位 → 不动；
- 中文行宽 ≤ 英文原行宽且英文原行本身不长 → 不动（修掉「宽对话框被硬拆两行」）；
- 其余 → 按词元切成 ≤16 单位的段，用**空格**连接，交给游戏自己的折行算法。

只允许插入空白（空格 / 换行），不增删任何文字——由 `scripts/break_invariant2.js` 逐条校验。

## 六、自行构建（开发者）

需要 .NET 8 SDK、[UndertaleModTool](https://github.com/UnderminersTeam/UndertaleModTool)（CLI 版）
与 Node.js。游戏原始文件需自备（仓库不含）。

```powershell
# 1) 生成玩家补丁载荷
node scripts\make_payload.js
node scripts\make_relocs.js
# 2) 重建 exe（从原版 exe 起）
node scripts\exe_patch.js --in <原版>\False Echo.exe --out out\FalseEcho_cn.exe --spec apply\exe_spec.json
# 3) 重建 data.win（从原版 data.win 起）
UndertaleModCli.exe load <原版>\data.win -s scripts\apply_all.csx -o out\data_cn.win -f
# 4) 三重校验
node scripts\verify_pool_intact.js out\FalseEcho_cn.exe
node scripts\verify_blobs.js      out\FalseEcho_cn.exe
node scripts\verify_datawin_text.js out\data_cn.win
```

游戏版本升级后：先比对新版与旧版的文本块差异（`scripts/newbuild_map.js`、`scripts/newbuild_diff.js`），
再用 `scripts/migrate_newbuild.js` 迁移块下标、补译新增文案、更新版本号字面量。

## 七、已知问题

- 纸面底部「按任意键继续」提示在长文本下会与游戏自身的提示重叠（引擎渲染行为，英文版不复现）；
- 每日命令封面的抬头行距是按拉丁字高设计的，中文墨迹更高时会略有压叠；
- 2× 缩放下中文笔画有约 1px 的抗锯齿柔化；
- 规则手册 / 前线新闻 / 战争日记 / Endless 模式 / 证件页等页面尚未逐屏实机回归。

### Release 与版本对应

| Release Tag | 适配游戏版本 | 补丁包 |
|---|---|---|
| `v0.9.8.6-cn1` | False Echo Demo v0.9.8.6 | `FalseEcho-CN-Patch-v0986.zip` |

游戏版本更新后补丁会因指纹校验而拒绝安装，需按 `scripts/migrate_newbuild.js` 的流程迁移后重新发布 Release。

## 八、致谢

- 原作《False Echo / 虚妄回响》及其开发团队；
- [UndertaleModTool](https://github.com/UnderminersTeam/UndertaleModTool) 与 UndertaleModLib。
