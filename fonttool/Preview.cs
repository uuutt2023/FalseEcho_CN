using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// ============================================================================
// fonttool preview —— 模拟 GameMaker 位图字体渲染，输出预览 PNG 以目视校验基线
//   preview <fonts.json> <fontoutDir> <fontName> <textFile> <out.png>
// ============================================================================

internal static class Preview
{
    public static int Run(string[] args)
    {
        if (args.Length < 6) { Console.Error.WriteLine("usage: fonttool preview <fonts.json> <fontoutDir> <fontName> <textFile> <out.png>"); return 1; }
        string fontsJson = args[1], fontDir = args[2], fontName = args[3], textFile = args[4], outPng = args[5];

        var plan = JObject.Parse(File.ReadAllText(Path.Combine(fontDir, "fontplan.json"), Encoding.UTF8));
        int pageSize = plan["pageSize"].Value<int>();
        var pages = new List<Bitmap>();
        foreach (var p in (JArray)plan["pages"]) pages.Add(new Bitmap(p.ToString()));

        JObject fo = null;
        foreach (var f in (JArray)plan["fonts"])
            if (f["name"].Value<string>() == fontName) fo = (JObject)f;
        if (fo == null) { Console.Error.WriteLine("font not found: " + fontName); return 2; }
        int page = fo["page"].Value<int>();
        int baseline = fo["baseline"].Value<int>();
        int cellH = fo["cellH"].Value<int>();

        var glyphs = new Dictionary<int, (int x, int y, int w, int h, int shift)>();
        foreach (var g in (JArray)fo["latin"])
            glyphs[g["c"].Value<int>()] = (g["x"].Value<int>(), g["y"].Value<int>(), g["w"].Value<int>(), g["h"].Value<int>(), g["shift"].Value<int>());
        foreach (var g in (JArray)fo["cjk"])
            glyphs[g["c"].Value<int>()] = (g["x"].Value<int>(), g["y"].Value<int>(), g["w"].Value<int>(), g["h"].Value<int>(), g["shift"].Value<int>());

        string text = File.ReadAllText(textFile, Encoding.UTF8).Replace("\r\n", "\n");
        var lines = text.Split('\n');

        int lineH = cellH + 4;
        int w = 10, h = lineH * lines.Length + 10;
        foreach (var ln in lines)
        {
            int lw = 0;
            foreach (char c in ln) if (glyphs.TryGetValue(c, out var g)) lw += g.shift; else lw += 6;
            w = Math.Max(w, lw + 12);
        }
        using var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (var g2 = Graphics.FromImage(bmp))
        {
            g2.Clear(Color.FromArgb(255, 12, 14, 12));
            g2.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;
            int ly = 5;
            foreach (var ln in lines)
            {
                int pen = 5;
                foreach (char c in ln)
                {
                    if (glyphs.TryGetValue(c, out var g))
                    {
                        var src = pages[page];
                        for (int yy = 0; yy < g.h; yy++)
                        {
                            int sy = g.y + yy;
                            if (sy < 0 || sy >= src.Height) continue;
                            for (int xx = 0; xx < g.w; xx++)
                            {
                                int sx = g.x + xx;
                                if (sx < 0 || sx >= src.Width) continue;
                                var col = src.GetPixel(sx, sy);
                                if (col.A > 0) bmp.SetPixel(pen + xx, ly + yy, Color.FromArgb(col.A, 220, 235, 210));
                            }
                        }
                        pen += g.shift;
                    }
                    else pen += 6;
                }
                // 基线参考线
                for (int xx = 0; xx < w; xx++) bmp.SetPixel(xx, ly + baseline, Color.FromArgb(120, 255, 60, 60));
                ly += lineH;
            }
        }
        bmp.Save(outPng, ImageFormat.Png);
        Console.WriteLine($"preview written: {outPng} ({w}x{h}) font={fontName} baseline={baseline} cellH={cellH}");
        return 0;
    }
}

