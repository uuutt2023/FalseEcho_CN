// 检查所有字形：SourceWidth > Shift 即会与后一字重叠
using System;
using System.Linq;

int bad = 0;
foreach (var f in Data.Fonts)
{
    if (f == null) continue;
    string nm = f.Name?.Content ?? "(null)";
    int n = 0; string sample = "";
    foreach (var g in f.Glyphs)
    {
        if (g.SourceWidth > g.Shift)
        {
            n++;
            if (sample == "") sample += $"U+{g.Character:X4} '{g.Character}' w={g.SourceWidth} shift={g.Shift} off={g.Offset}; ";
        }
    }
    bad += n;
    Console.WriteLine($"{nm,-22} over-wide glyphs = {n}   {sample}");
}
Console.WriteLine("TOTAL over-wide = " + bad);
