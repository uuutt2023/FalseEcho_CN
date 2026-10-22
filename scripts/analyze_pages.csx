using System.Text;
using UndertaleModLib.Util;

var sb = new StringBuilder();
sb.AppendLine("=== 纹理组 ===");
try
{
    if (Data.TextureGroupInfo == null) sb.AppendLine("  (null)");
    else
        foreach (var g in Data.TextureGroupInfo)
            sb.AppendLine($"  DIR={g?.Directory?.Content} NAME={g?.Name?.Content} EXT={g?.Extension?.Content} pages={(g?.TexturePages == null ? 0 : g.TexturePages.Count)}");
}
catch (Exception e) { sb.AppendLine("  ERR " + e.Message); }

sb.AppendLine();
sb.AppendLine("=== 导出纹理页 PNG ===");
string outDir = @"E:\FalseEcho_CN\pages";
Directory.CreateDirectory(outDir);
int idx = 0;
foreach (var page in Data.EmbeddedTextures)
{
    try
    {
        var img = page.TextureData?.Image;
        if (img == null) { sb.AppendLine($"PAGE {page.Name?.Content}: (无图像)"); idx++; continue; }
        string fn = Path.Combine(outDir, $"page_{idx:D2}.png");
        using (var fs = File.Create(fn)) img.SavePng(fs);
        sb.AppendLine($"PAGE {idx:D2} '{page.Name?.Content}' {img.Width}x{img.Height} -> {fn}");
    }
    catch (Exception e) { sb.AppendLine($"PAGE {idx} ERR {e.Message}"); }
    idx++;
}

System.IO.File.WriteAllText(@"E:\FalseEcho_CN\page_space.txt", sb.ToString());
Console.WriteLine("done");
