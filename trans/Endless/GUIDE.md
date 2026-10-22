# 《虚妄回响 / False Echo》Endless 模式翻译规范

## 任务
把 `E:\FalseEcho_CN\trans\Endless\in_XX.tsv` 里的每一行英文翻译成简体中文，
输出到 `E:\FalseEcho_CN\trans\Endless\out_XX.tsv`（XX 与输入批次号一致）。

## 格式（必须严格遵守）
- 输入行格式：`key<TAB>英文原文`
- 输出行格式：`key<TAB>简体中文译文`
- **行数必须与输入完全一致，顺序必须完全一致，key 必须原样复制（一个字符都不能改）**
- 每行之间只用一个半角 TAB 分隔，译文里**不要出现 TAB 字符**
- 不要输出行号、注释、空行、引号、代码块围栏
- 文件编码 UTF-8（无 BOM）
- 输出文件只包含译文行，**不要加表头**

## 保留规则（重要）
1. 原文里出现的字面量 `\r\n`（反斜杠 + r + 反斜杠 + n）要**原样保留**在译文中，
   位置对应原文的位置。例如：
   `NEWS FROM THE FRONT:\r\n\r\nOur navy has...` → `前线快讯：\r\n\r\n我方海军……`
2. 原文若有 `{red}`、`{/red}` 等富文本标签，必须原样保留（本次 Endless 批次中没有，但万一出现也要保留）。
3. 原文中的大写电报正文（ALL CAPS）译为中文时用正常中文标点，不要保留全大写英文。
4. 原文里的专有名词按下面的术语表处理，不要自行另造译名。

## 术语表（务必统一）
| 英文 | 中文 |
|---|---|
| ECHO / TRUE ECHO | 回响 / 真回响 |
| FALSE ECHO | 伪回响 |
| Obscura | 暗影机（密码破译机） |
| STASEC | 国家安全委 |
| Daily Orders | 每日命令 |
| Teletyper | 电传打字机 |
| Rotor | 转子 |
| Stamp | 印章（红章 / 蓝章） |
| Verification (message) | 核验电文 |
| Output slip / output paper | 输出电文 |
| Oppressia | 奥普雷西亚 |
| Stelantic Ocean | 斯泰兰蒂克大洋 |
| La Duchelle | 拉杜谢勒 |
| Sub (number) | XX 号潜艇（如「227 号潜艇」）|
| XO (Executive Officer) | 执行官 |
| PO / Political Officer | 政治委员 |
| Captain | 舰长 |
| Watch Officer | 值更官 |
| Torpedo Officer | 鱼雷官 |
| Radioman | 报务员 |
| Helmsman | 舵手 |
| Engineer | 轮机兵 |
| Medic | 舰医 |
| Cook | 厨兵 |
| Quartermaster | 军需官 |
| Crypto Officer | 密码专员（玩家角色）|
| Sovetia | 苏维埃国 |
| Gerlin | 格林 |
| Karsk | 卡尔斯克 |
| Lomnia | 洛姆尼亚 |
| Enigma | 恩尼格玛 |
| MARKER (nine) | 航标（九号）|
| quadrant BE/BF | BE/BF 象限 |

## 语气与文风
- 这是苏维埃式的军事恐怖题材：公文、命令、电报、船员私下闲谈。
- 军官说话简短、命令式、克制；船员说话随意、略带粗鲁与抱怨；玩家（密码专员）
  说话礼貌简短。
- `sir` 译为「长官」；`yes sir` 译为「是，长官！」或「是，长官。」
- `No sir` 译为「不，长官。」
- 不要添加原文没有的语气词、称呼或解释。
- 保留原文的口语化/不完整语法（例如原文有语法错误或拼写错误时，不要「修正」成通顺中文，
  保持原文的粗糙感）。
- 同一句台词在不同 key 下若原文不同，译文也要随之不同，不要强行统一。

## 示例
```
day_99_txt_dia_ver_intro_01	Verification message. Short check	 no speech.
→	day_99_txt_dia_ver_intro_01	核验电文。简查\t不出声。
```
