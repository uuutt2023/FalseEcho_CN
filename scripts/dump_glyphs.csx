using System;
using System.Text;
foreach (var f in Data.Fonts)
{
    if (f == null || f.Name == null) continue;
    string nm = f.Name.Content;
    if (nm != "fnt_DO_text" && nm != "fnt_ContentExtended") continue;
    Console.WriteLine("=== " + nm + " glyphs=" + f.Glyphs.Count + " range=" + f.RangeStart + "-" + f.RangeEnd);
    foreach (int c in new int[] { 0x80CC, 0x9762, 0x5B89, 0x5168, 0x5B98, 0x9A8C, 0x660E, 0x6709, 0x8BC8, 0x6BCF, 0x65E5, 0x547D, 0x4EE4 })
    {
        foreach (var g in f.Glyphs)
        {
            if (g.Character == c)
            {
                Console.WriteLine($"  U+{c:X4} src=({g.SourceX},{g.SourceY}) w={g.SourceWidth} h={g.SourceHeight} shift={g.Shift} off={g.Offset}");
                break;
            }
        }
    }
}
