// 导出字体数据（含异常字体兜底），输出路径取自环境变量 FE_FONTS_OUT
var outPath = Environment.GetEnvironmentVariable("FE_FONTS_OUT");
if (string.IsNullOrEmpty(outPath)) outPath = @"E:\FalseEcho_CN\fonts.json";
var sb = new System.Text.StringBuilder();
sb.Append("{\"fonts\":[");
int fi = 0;
foreach (var f in Data.Fonts)
{
    if (fi > 0) sb.Append(",");
    if (f == null) { sb.Append("{\"index\":").Append(fi).Append(",\"null\":true}"); fi++; continue; }
    sb.Append("{\"index\":").Append(fi);
    string nm = "?";
    try { nm = f.Name.ToString(); } catch (Exception e) { nm = "<ERR:" + e.GetType().Name + ">"; }
    sb.Append(",\"name\":\"").Append(nm.Replace("\"", "\\\"")).Append("\"");
    try { sb.Append(",\"emSize\":").Append(f.EmSize.ToString(System.Globalization.CultureInfo.InvariantCulture)); } catch (Exception e) { }
    try { sb.Append(",\"ascender\":").Append(f.Ascender.ToString(System.Globalization.CultureInfo.InvariantCulture)); } catch (Exception e) { }
    try { sb.Append(",\"lineHeight\":").Append(f.LineHeight.ToString(System.Globalization.CultureInfo.InvariantCulture)); } catch (Exception e) { }
    try { sb.Append(",\"ascenderOffset\":").Append(f.AscenderOffset.ToString(System.Globalization.CultureInfo.InvariantCulture)); } catch (Exception e) { }
    int pageIdx = -1;
    try { string tname = f.Texture.TexturePage.Name.Content; int sp = tname.LastIndexOf(' '); if (sp >= 0) int.TryParse(tname.Substring(sp + 1), out pageIdx); } catch (Exception e) { }
    sb.Append(",\"texturePage\":").Append(pageIdx);
    sb.Append(",\"glyphs\":[");
    bool firstG = true;
    try
    {
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
    }
    catch (Exception e) { sb.Append("],\"glyphErr\":\"").Append(e.GetType().Name).Append("\""); sb.Append(']'); fi++; continue; }
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
System.IO.File.WriteAllText(outPath, sb.ToString(), new System.Text.UTF8Encoding(false));
Console.WriteLine("written " + outPath + " fonts=" + Data.Fonts.Count);
