// 校验写回结果
using System.IO.Compression;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

string path = @"E:\FalseEcho_CN\out\data_cn.win";
Console.WriteLine("文件: " + path + "  大小: " + new FileInfo(path).Length);

int fi = 0;
foreach (var f in Data.Fonts)
{
    if (f == null) { Console.WriteLine($"FONT[{fi}] (null)"); fi++; continue; }
    string nm = f.Name?.Content ?? "?";
    int cjk = 0, maxc = 0;
    bool sorted = true;
    int prev = -1;
    foreach (var g in f.Glyphs)
    {
        if (g.Character > 127) cjk++;
        if (g.Character > maxc) maxc = g.Character;
        if (g.Character < prev) sorted = false;
        prev = g.Character;
    }
    string tex = f.Texture == null ? "NULL" : ("page" + f.Texture.TexturePage?.Name?.Content + " " + f.Texture.SourceWidth + "x" + f.Texture.SourceHeight);
    Console.WriteLine($"FONT[{fi}] {nm,-24} 字形={f.Glyphs.Count} CJK={cjk} maxChar={maxc} Range={f.RangeStart}-{f.RangeEnd} sorted={sorted} tex={tex}");
    fi++;
}

Console.WriteLine();
Console.WriteLine("EmbeddedTextures = " + Data.EmbeddedTextures.Count + ", TexturePageItems = " + Data.TexturePageItems.Count);

// 抽查几个本地化条目
int[] probe = { 2575, 2576, 2577, 2578, 2579 };
foreach (int idx in probe)
{
    string s = Data.Strings[idx].Content;
    try
    {
        byte[] raw = Convert.FromBase64String(s);
        using var ms = new MemoryStream(raw);
        using var ds = new ZLibStream(ms, CompressionMode.Decompress);
        using var outMs = new MemoryStream();
        ds.CopyTo(outMs);
        string text = new UTF8Encoding(false).GetString(outMs.ToArray());
        var arr = JArray.Parse(text);
        // 找一个含中文的条目
        string sample = "";
        for (int i = 0; i < arr.Count && i < 4000; i++)
        {
            var pair = arr[i];
            if (pair.Type != JTokenType.Array) continue;
            string v = pair[1]?.ToString() ?? "";
            bool hasCjk = false;
            foreach (char c in v) if (c > 127) { hasCjk = true; break; }
            if (hasCjk) { sample = pair[0].ToString() + " = " + (v.Length > 80 ? v.Substring(0, 80) : v); break; }
        }
        Console.WriteLine($"blob {idx}: {arr.Count} 条, 示例: {sample}");
    }
    catch (Exception e) { Console.WriteLine("blob " + idx + " 解码失败: " + e.Message); }
}
