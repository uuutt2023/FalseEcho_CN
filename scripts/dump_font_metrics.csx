// dump_font_metrics.csx —— 打印字体资源字段（反射）与代表字形度量
using System;
using System.Text;
using System.Reflection;

Console.WriteLine("=== UndertaleFont 可用成员 ===");
foreach (var p in typeof(UndertaleModLib.Models.UndertaleFont).GetProperties(BindingFlags.Public | BindingFlags.Instance))
    Console.WriteLine($"  prop {p.Name} : {p.PropertyType.Name}");
foreach (var fld in typeof(UndertaleModLib.Models.UndertaleFont).GetFields(BindingFlags.Public | BindingFlags.Instance))
    Console.WriteLine($"  field {fld.Name} : {fld.FieldType.Name}");

Console.WriteLine("\n=== 各字体度量 ===");
foreach (var f in Data.Fonts)
{
    if (f == null) continue;
    string nm = f.Name?.Content ?? "(null)";
    var t = f.GetType();
    object Get(string n) => t.GetProperty(n)?.GetValue(f);
    int cjkW = -1, cjkH = -1, cjkShift = -1, cjkOff = -1, cjkCh = -1;
    int latW = -1, latH = -1, latShift = -1, latOff = -1;
    foreach (var g in f.Glyphs)
    {
        if (g.Character >= 0x2E80 && cjkW < 0) { cjkW = g.SourceWidth; cjkH = g.SourceHeight; cjkShift = g.Shift; cjkOff = g.Offset; cjkCh = g.Character; }
        if (g.Character == 0x41 && latW < 0) { latW = g.SourceWidth; latH = g.SourceHeight; latShift = g.Shift; latOff = g.Offset; }
    }
    Console.WriteLine($"{nm,-22} LineHeight={Get("LineHeight")} EmSize={Get("EmSize")} Padding={Get("Padding")} PaddingTop={Get("PaddingTop")} glyphs={f.Glyphs.Count,5} | CJK U+{cjkCh:X4} w={cjkW} h={cjkH} shift={cjkShift} off={cjkOff} | 'A' w={latW} h={latH} shift={latShift} off={latOff}");
}
