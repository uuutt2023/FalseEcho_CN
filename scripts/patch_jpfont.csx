// ============================================================================
// patch_jpfont.csx —— 调整 fnt_japanese 的度量
//   用途：验证游戏绘制 CJK 时是否按 font.EmSize 缩放。
//   把 EmSize 设为字格高 21 后，若 12px 语境里的汉字从 21px 缩到 12px，
//   说明游戏按 em 缩放 CJK 字体（此时把 CJK 墨迹画满 21px 字格即可完美对齐）。
//   用法: UndertaleModCli load <data.win> -s patch_jpfont.csx -o <out> -f
// ============================================================================
int idx = -1;
for (int i = 0; i < Data.Fonts.Count; i++)
{
    try
    {
        string nm = Data.Fonts[i].Name.ToString();
        if (nm.Contains("japanese")) { idx = i; Console.WriteLine($"  candidate font[{i}] name={nm}"); }
    }
    catch (Exception e) { }
}
if (idx < 0) { Console.WriteLine("!! fnt_japanese not found"); return; }
var f = Data.Fonts[idx];
Console.WriteLine($"font[{idx}] {f.Name} em={f.EmSize} asc={f.Ascender} lh={f.LineHeight} ao={f.AscenderOffset} glyphs={f.Glyphs.Count}");

string env = Environment.GetEnvironmentVariable("FE_JP_EMSIZE");
int em = string.IsNullOrEmpty(env) ? 21 : int.Parse(env);
if (em != f.EmSize)
{
    f.EmSize = em;
    Console.WriteLine($"EmSize -> {f.EmSize}");
}
else
{
    Console.WriteLine("EmSize unchanged");
}
