int i = 0;
foreach (var f in Data.Fonts)
{
    string nm = "<?>";
    try { nm = f.Name.ToString(); } catch (Exception e) { nm = "ERR:" + e.GetType().Name; }
    string tex = "none";
    try { tex = f.Texture == null ? "NULL" : ("TPI#" + f.Texture.SourceX + "," + f.Texture.SourceY + " " + f.Texture.SourceWidth + "x" + f.Texture.SourceHeight); } catch (Exception e) { tex = "ERR:" + e.GetType().Name; }
    string gl = "?";
    try { gl = f.Glyphs.Count.ToString(); } catch (Exception e) { gl = "ERR:" + e.GetType().Name; }
    string em = "?";
    try { em = f.EmSize.ToString(); } catch (Exception e) { em = "ERR"; }
    string asc = "?";
    try { asc = f.Ascender + "/" + f.LineHeight + "/" + f.AscenderOffset; } catch (Exception e) { asc = "ERR"; }
    Console.WriteLine("FONT[" + i + "] name=" + nm + " em=" + em + " asc=" + asc + " glyphs=" + gl + " tex=" + tex);
    // 列出前 3 个字形
    try
    {
        int k = 0;
        foreach (var g in f.Glyphs)
        {
            if (k++ >= 3) break;
            Console.WriteLine("     g " + g.Character + " (" + (char)g.Character + ") src=" + g.SourceX + "," + g.SourceY + " " + g.SourceWidth + "x" + g.SourceHeight + " shift=" + g.Shift + " off=" + g.Offset);
        }
    }
    catch (Exception e) { Console.WriteLine("     glyph ERR " + e.GetType().Name + ": " + e.Message); }
    i++;
}
