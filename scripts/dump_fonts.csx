// 导出字体数据为 JSON，供 FETool 分析与制图
var sb = new System.Text.StringBuilder();
sb.Append("{\"fonts\":[");
bool firstFont = true;
int fi = 0;
foreach (var f in Data.Fonts)
{
    if (f == null) { fi++; continue; }
    string nm;
    try { nm = f.Name.ToString(); } catch (Exception e) { fi++; continue; }
    if (!firstFont) sb.Append(",");
    firstFont = false;
    sb.Append("{\"index\":").Append(fi);
    sb.Append(",\"name\":\"").Append(nm.Replace("\"", "\\\"")).Append("\"");
    sb.Append(",\"emSize\":").Append(f.EmSize.ToString(System.Globalization.CultureInfo.InvariantCulture));
    sb.Append(",\"ascender\":").Append(f.Ascender.ToString(System.Globalization.CultureInfo.InvariantCulture));
    sb.Append(",\"lineHeight\":").Append(f.LineHeight.ToString(System.Globalization.CultureInfo.InvariantCulture));
    sb.Append(",\"ascenderOffset\":").Append(f.AscenderOffset.ToString(System.Globalization.CultureInfo.InvariantCulture));
    sb.Append(",\"bold\":").Append(f.Bold ? "true" : "false");
    int pageIdx = -1;
    try {
        string tname = f.Texture.TexturePage.Name.Content;   // "Texture 6"
        int sp = tname.LastIndexOf(' ');
        if (sp >= 0) int.TryParse(tname.Substring(sp + 1), out pageIdx);
    } catch (Exception e) { }
    sb.Append(",\"texturePage\":").Append(pageIdx);
    sb.Append(",\"tpiX\":").Append(f.Texture == null ? 0 : f.Texture.SourceX.ToString());
    sb.Append(",\"tpiY\":").Append(f.Texture == null ? 0 : f.Texture.SourceY.ToString());
    sb.Append(",\"tpiW\":").Append(f.Texture == null ? 0 : f.Texture.SourceWidth.ToString());
    sb.Append(",\"tpiH\":").Append(f.Texture == null ? 0 : f.Texture.SourceHeight.ToString());
    sb.Append(",\"glyphs\":[");
    bool firstG = true;
    foreach (var g in f.Glyphs)
    {
        if (!firstG) sb.Append(",");
        firstG = false;
        sb.Append("{\"c\":").Append(g.Character);
        sb.Append(",\"x\":").Append(g.SourceX).Append(",\"y\":").Append(g.SourceY);
        sb.Append(",\"w\":").Append(g.SourceWidth).Append(",\"h\":").Append(g.SourceHeight);
        sb.Append(",\"shift\":").Append(g.Shift).Append(",\"off\":").Append(g.Offset);
        sb.Append("}");
    }
    sb.Append("]}");
    fi++;
}
sb.Append("],\"embeddedTextures\":[");
for (int i = 0; i < Data.EmbeddedTextures.Count; i++)
{
    if (i > 0) sb.Append(",");
    var t = Data.EmbeddedTextures[i];
    sb.Append("{\"index\":").Append(i).Append(",\"w\":").Append(t.TextureWidth).Append(",\"h\":").Append(t.TextureHeight).Append("}");
}
sb.Append("]}");
System.IO.File.WriteAllText("E:\\FalseEcho_CN\\fonts.json", sb.ToString(), new System.Text.UTF8Encoding(false));
Console.WriteLine("fonts.json written, fonts=" + Data.Fonts.Count + " embedded=" + Data.EmbeddedTextures.Count);

