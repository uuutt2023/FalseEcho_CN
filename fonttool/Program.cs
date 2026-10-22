using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// ============================================================================
// fonttool —— 《虚妄回响》CJK 位图字体图集生成器
//   metrics <fonts.json> <pagesDir>
//   build   <fonts.json> <pagesDir> <chars.txt> <outDir>
//
// 关键模型（由像素实测确认）：
//   · 字格高 H = 现有字形 SourceHeight（全字体统一）
//   · 字格底与行框底对齐 → 基线位于 字格内「x」墨迹末行+1
//   · CJK 字形 SourceHeight 取 H，em 盒基线落在同一行 → 与拉丁字形天然对齐
//   · em 盒完全位于基线之上，故 em 尺寸上限 = 基线行号
// ============================================================================

internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Length == 0) { Console.Error.WriteLine("usage: fonttool <metrics|build> ..."); return 1; }
        switch (args[0].ToLowerInvariant())
        {
            case "metrics": return Metrics(args[1], args[2]);
            case "build": return Build(args[1], args[2], args[3], args[4]);
            case "preview": return Preview.Run(args);
            default: Console.Error.WriteLine("unknown cmd"); return 1;
        }
    }

    private sealed class GlyphRec { public int c, x, y, w, h, shift, off; }

    private sealed class FontRec
    {
        public int index;
        public string name = "";
        public float emSize, ascender, lineHeight, ascenderOffset;
        public bool bold;
        public int texturePage, tpiX, tpiY, tpiW, tpiH;
        public List<GlyphRec> glyphs = new();
        public int cellH;
        public int baseline;   // 基线行号（'x' 墨迹末行 + 1）
        public int cjkEm;      // 实际使用的 em 尺寸
        public int capH;       // 拉丁大写高（'H' 墨迹高度）—— CJK 目标尺寸基准
    }

    private static List<FontRec> LoadFonts(string path)
    {
        var root = JObject.Parse(File.ReadAllText(path, Encoding.UTF8));
        var list = new List<FontRec>();
        foreach (var f in (JArray)root["fonts"])
        {
            var fr = new FontRec
            {
                index = f["index"].Value<int>(),
                name = f["name"].Value<string>().Trim('"'),
                emSize = f["emSize"].Value<float>(),
                ascender = f["ascender"].Value<float>(),
                lineHeight = f["lineHeight"].Value<float>(),
                ascenderOffset = f["ascenderOffset"].Value<float>(),
                bold = f["bold"].Value<bool>(),
                texturePage = f["texturePage"].Value<int>(),
                tpiX = f["tpiX"].Value<int>(),
                tpiY = f["tpiY"].Value<int>(),
                tpiW = f["tpiW"].Value<int>(),
                tpiH = f["tpiH"].Value<int>(),
            };
            foreach (var g in (JArray)f["glyphs"])
                fr.glyphs.Add(new GlyphRec
                {
                    c = g["c"].Value<int>(), x = g["x"].Value<int>(), y = g["y"].Value<int>(),
                    w = g["w"].Value<int>(), h = g["h"].Value<int>(),
                    shift = g["shift"].Value<int>(), off = g["off"].Value<int>(),
                });
            fr.cellH = fr.glyphs.Count > 0 ? fr.glyphs.Max(x => x.h) : 0;
            list.Add(fr);
        }
        return list;
    }

    private static Dictionary<int, Bitmap> LoadPages(string pagesDir, int count)
    {
        var map = new Dictionary<int, Bitmap>();
        for (int i = 0; i < count; i++)
        {
            string p = Path.Combine(pagesDir, $"page_{i:D2}.png");
            if (File.Exists(p)) map[i] = new Bitmap(p);
        }
        return map;
    }

    private static (int top, int bottom, int left, int right) InkBox(Bitmap page, FontRec f, GlyphRec gl)
    {
        int px0 = f.tpiX + gl.x, py0 = f.tpiY + gl.y;
        int top = int.MaxValue, bottom = -1, left = int.MaxValue, right = -1;
        for (int yy = 0; yy < gl.h; yy++)
        {
            int sy = py0 + yy;
            if (sy < 0 || sy >= page.Height) continue;
            for (int xx = 0; xx < gl.w; xx++)
            {
                int sx = px0 + xx;
                if (sx < 0 || sx >= page.Width) continue;
                if (page.GetPixel(sx, sy).A > 16)
                {
                    if (yy < top) top = yy;
                    if (yy > bottom) bottom = yy;
                    if (xx < left) left = xx;
                    if (xx > right) right = xx;
                }
            }
        }
        if (bottom < 0) return (0, -1, 0, -1);
        return (top, bottom, left, right);
    }

    private static int Metrics(string fontsJson, string pagesDir)
    {
        var fonts = LoadFonts(fontsJson);
        var pages = LoadPages(pagesDir, 20);
        foreach (var f in fonts)
        {
            if (f.texturePage < 0 || !pages.TryGetValue(f.texturePage, out var page)) { Console.WriteLine($"{f.name,-24} no page"); continue; }
            string desc = "";
            var gx = f.glyphs.FirstOrDefault(x => x.c == 'x') ?? f.glyphs.FirstOrDefault(x => x.c == 'A');
            if (gx != null)
            {
                var ink = InkBox(page, f, gx);
                f.baseline = ink.bottom + 1;
                desc = $"baselineRow={f.baseline} (ink {ink.top}..{ink.bottom})";
            }
            Console.WriteLine($"{f.name,-24} em={f.emSize,-5} cellH={f.cellH,-3} asc={f.ascender,-4} ao={f.ascenderOffset,-3} lh={f.lineHeight,-4} | {desc}");
            // 拉丁字高：'H' = 大写高(cap)，'x' = x 高，'p' = 下伸部
            var gH = f.glyphs.FirstOrDefault(x => x.c == 'H');
            var gx2 = f.glyphs.FirstOrDefault(x => x.c == 'x');
            var gp = f.glyphs.FirstOrDefault(x => x.c == 'p');
            string lat = "";
            if (gH != null) { var i2 = InkBox(page, f, gH); lat += $"capH={i2.bottom - i2.top + 1}(rows {i2.top}..{i2.bottom}) "; }
            if (gx2 != null) { var i3 = InkBox(page, f, gx2); lat += $"xH={i3.bottom - i3.top + 1}(rows {i3.top}..{i3.bottom}) "; }
            if (gp != null) { var i4 = InkBox(page, f, gp); lat += $"pInk={i4.bottom - i4.top + 1}(rows {i4.top}..{i4.bottom}) "; }
            // 原版已内置的假名（CJK 区）字高 —— 代表该字体「原设计」的 CJK 视觉尺寸
            var kana = f.glyphs.FirstOrDefault(x => x.c >= 0x3000 && x.c <= 0x30FF);
            if (kana != null) { var i5 = InkBox(page, f, kana); lat += $"kanaH={i5.bottom - i5.top + 1}(U+{kana.c:X4} rows {i5.top}..{i5.bottom}) "; }
            Console.WriteLine($"    {lat}");
        }
        return 0;
    }

    private const int PAGE = 2048;

    private static int CjkEm(FontRec f)
    {
        // 诊断/微调开关：FE_CJK_EM_OVERRIDE="japanese=11;TitleText=12"
        // 形如 "字体名子串=em尺寸"，分号分隔。用于单变量 A/B 验证字号效果。
        string ov = Environment.GetEnvironmentVariable("FE_CJK_EM_OVERRIDE");
        if (!string.IsNullOrEmpty(ov))
        {
            foreach (var part in ov.Split(';'))
            {
                var kv = part.Split('=');
                if (kv.Length == 2 && f.name.IndexOf(kv[0].Trim(), StringComparison.OrdinalIgnoreCase) >= 0)
                    return int.Parse(kv[1].Trim());
            }
        }
        // 规则：CJK 墨迹高 ≈ 同字体的拉丁大写高（capH）。
        // 本作只按拉丁文排版，行高 = lineHeight、字格高 = cellH 都是为拉丁字形定的。
        // 若 CJK 按字体 em 光栅化（Standard_Pixel/textbody 为 24、TitleText 为 18），
        // 中文字高会达到拉丁字高的 1.4~2.4 倍 → 压到上一行、撑破姓名条高亮条、
        // 证件页标题两行互压。故 CJK 尺寸一律对齐同字体的拉丁字高。
        int cap = f.capH > 0 ? f.capH : (int)Math.Round(f.emSize * 0.6f);
        int target = cap + 1;
        if (target < 10) target = 10;                                  // 可读性下限
        if (f.baseline > 0 && target > f.baseline) target = f.baseline;  // 必须完全落在基线之上
        // 行距约束：多行文字的上下行间距 = 该字体 lineHeight。若 CJK 墨迹高 >= lineHeight，
        // 相邻两行会互相压叠（实测 fnt_ContentExtended/ContentText: lh=9，中文 em=10 → 上下行各压 1px）。
        // 点阵字体的 CJK 墨迹高 ≈ em-1（em 盒含 1px 下伸），故 em 不得超过 lineHeight+1。
        if (f.lineHeight > 0 && target > f.lineHeight + 1) target = (int)Math.Max(1, f.lineHeight + 1);
        // 归一到像素字体的原生设计尺寸（8/10/12/16/24），避免缩放导致的糊字
        int[] native = { 8, 10, 12, 16, 24 };
        int em = 0;
        foreach (int a in native) if (a >= target && a <= target + 2) { em = a; break; }
        if (em == 0)
        {
            em = native[0];
            foreach (int a in native) if (a <= target) em = a;
        }
        return em;
    }

    // 从 TTF 文件真正加载字体：
    // System.Drawing.Font(string familyName, ...) 不会读取文件路径，只会回退到 "Microsoft Sans Serif"，
    // 必须用 PrivateFontCollection 显式加载。
    private static Font LoadFont(string ttfPath, float em, bool bold, out PrivateFontCollection pfc)
    {
        pfc = new PrivateFontCollection();
        try
        {
            pfc.AddFontFile(ttfPath);
            var fam = pfc.Families[0];
            return new Font(fam, em, bold ? FontStyle.Bold : FontStyle.Regular, GraphicsUnit.Pixel);
        }
        catch
        {
            pfc.Dispose();
            pfc = null;
            return new Font(ttfPath, em, bold ? FontStyle.Bold : FontStyle.Regular, GraphicsUnit.Pixel);
        }
    }

    private sealed class Group
    {
        public int em, baseline;
        public List<FontRec> fonts = new();
        public int ascEm, descEm, baseRow;
        public int pageIndex;
        public string ttf;                 // 该组使用的 CJK 字体源
        public Dictionary<char, (int x, int y)> cellPos = new();
        public Dictionary<string, Dictionary<int, (int x, int y)>> latinPos = new();
    }

    // 字体源目录：按 em 选最合适的像素字体
    private static readonly string[] ARK_DIR = {
        @"E:\FalseEcho_CN\fonts\fusion8\fusion-pixel-8px-proportional-zh_hans.ttf",
        @"E:\FalseEcho_CN\fonts\ark10\ark-pixel-10px-proportional-zh_hans.ttf",
        @"E:\FalseEcho_CN\fonts\ark12\ark-pixel-12px-proportional-zh_hans.ttf",
        @"E:\FalseEcho_CN\fonts\ark16\ark-pixel-16px-proportional-zh_cn.ttf",
    };

    // 选取该 em 分组使用的字体源：
    //   · 像素字体（Ark Pixel / Fusion Pixel）为其设计像素尺寸，1:1 渲染时笔画最锐利
    //   · em 与设计尺寸不匹配时改用黑体（可无损缩放，笔画不丢）
    private static string PickTtf(int em)
    {
        // Fusion Pixel 8px / Ark Pixel 10px / 12px / 16px 为原生设计尺寸；24px 无对应版本，用黑体
        if (em <= 8 && File.Exists(ARK_DIR[0])) return ARK_DIR[0];
        if (em <= 10 && File.Exists(ARK_DIR[1])) return ARK_DIR[1];
        if (em <= 12 && File.Exists(ARK_DIR[2])) return ARK_DIR[2];
        if (em <= 16 && File.Exists(ARK_DIR[3])) return ARK_DIR[3];
        string env = Environment.GetEnvironmentVariable("FE_CJK_FONT");
        if (!string.IsNullOrEmpty(env) && File.Exists(env)) return env;
        return @"C:\Windows\Fonts\simhei.ttf";
    }

    private static int Build(string fontsJson, string pagesDir, string charsFile, string outDir)
    {
        Directory.CreateDirectory(outDir);
        var fonts = LoadFonts(fontsJson);
        var pages = LoadPages(pagesDir, 20);

        var chars = new List<char>();
        var seen = new HashSet<char>();
        foreach (string line in File.ReadAllLines(charsFile, Encoding.UTF8))
            foreach (char c in line)
                if ((int)c > 127 && seen.Add(c)) chars.Add(c);
        Console.WriteLine($"charset: {chars.Count} unique non-ASCII chars");
        if (chars.Count == 0) { Console.Error.WriteLine("empty charset"); return 2; }

        var targets = fonts.Where(f => !f.name.StartsWith("__") && f.cellH > 0).ToList();

        foreach (var f in targets)
        {
            if (pages.TryGetValue(f.texturePage, out var page))
            {
                var gx = f.glyphs.FirstOrDefault(x => x.c == 'x') ?? f.glyphs.FirstOrDefault(x => x.c == 'A');
                if (gx != null) { var ink = InkBox(page, f, gx); f.baseline = ink.bottom + 1; }
                var gH = f.glyphs.FirstOrDefault(x => x.c == 'H');
                if (gH != null) { var ih = InkBox(page, f, gH); f.capH = ih.bottom - ih.top + 1; }
            }
            f.cjkEm = CjkEm(f);
        }
        foreach (var f in targets)
            Console.WriteLine($"  {f.name,-24} em={f.cjkEm,-3} cellH={f.cellH,-3} baselineRow={f.baseline,-3} asc={f.ascender} ao={f.ascenderOffset} lh={f.lineHeight}");

        // 分组：(em, baseline) 相同者共享 CJK 单元
        var groups = new List<Group>();
        foreach (var f in targets)
        {
            var g = groups.FirstOrDefault(x => x.em == f.cjkEm && x.baseline == f.baseline);
            if (g == null) { g = new Group { em = f.cjkEm, baseline = f.baseline, ttf = PickTtf(f.cjkEm) }; groups.Add(g); }
            g.fonts.Add(f);
        }

        Console.WriteLine("cjk font per group:");
        foreach (var g in groups) Console.WriteLine($"  em={g.em,-3} base={g.baseline,-3} fonts={g.fonts.Count} -> {g.ttf}");

        // em 盒度量（用参考字 x 定位基线、参考字「国」定位 em 盒上沿）
        // 约束：em 盒必须完全落在基线之上且不超出字格 → ascEm ≤ baselineRow
        foreach (var g in groups)
        {
            int em = g.em;
            int baseMin = g.fonts.Min(f => f.baseline);
            int cellMin = g.fonts.Min(f => f.cellH);
            int asc = 0, desc = 0, baseRow = 0;
            for (; em >= 8; em--)
            {
                var f0 = LoadFont(g.ttf, em, g.fonts[0].bold, out var pfc0);
                using (pfc0)
                using (var font = f0)
                {
                    using var fmt = new StringFormat(StringFormat.GenericTypographic);
                    var m = MeasureRef(font, fmt);
                    asc = m.asc; desc = m.desc; baseRow = m.baseRow;
                }
                if (asc <= baseMin && baseMin + desc <= cellMin) break;
            }
            g.em = em;
            g.ascEm = asc; g.descEm = desc; g.baseRow = baseRow;
            Console.WriteLine($"  group em={g.em} base={g.baseline} fonts={g.fonts.Count}: ascEm={asc} descEm={desc} baseRow={baseRow} (baselineRow={baseMin} cellH={cellMin})");
        }

        // ---- 分页：逐组放置，溢出则新开一页 ----
        // 关键约束：GameMaker 按 Glyph.SourceWidth/SourceHeight 从图集取样。
        // CJK 字格的 SourceHeight = cellH（字格高），若图集行距 < cellH，
        // 取样会越界读到下一行字符的像素 → 表现为「贯穿横线」。
        // 因此行距必须 >= max(cellH, em)，且列距 >= max(em, cellH)。
        var pageUsed = new List<int>();
        int curPage = 0;
        pageUsed.Add(0);
        foreach (var g in groups)
        {
            int pitch = Math.Max(g.em + 1, g.fonts.Min(x => x.cellH) + 1);
            int perRow = PAGE / pitch;
            int rows = (int)Math.Ceiling(chars.Count / (double)perRow);
            int gridH = rows * pitch + 1;
            int latinH = 0;
            foreach (var f in g.fonts) latinH += LatinBandHeight(f);
            if (pageUsed[curPage] + gridH + latinH > PAGE && pageUsed[curPage] > 0)
            {
                curPage++;
                pageUsed.Add(0);
            }
            g.pageIndex = curPage;
            int y0 = pageUsed[curPage] + 1;
            for (int i = 0; i < chars.Count; i++)
            {
                int r = i / perRow, c = i % perRow;
                g.cellPos[chars[i]] = (c * pitch + 1, y0 + r * pitch);
            }
            pageUsed[curPage] += gridH;

            // 拉丁字形带
            int cy = pageUsed[curPage] + 1;
            foreach (var f in g.fonts)
            {
                var pos = new Dictionary<int, (int, int)>();
                int cx = 1, rowH = 0;
                foreach (var gl in f.glyphs)
                {
                    int w = Math.Max(1, gl.w), h = Math.Max(1, gl.h);
                    if (cx + w + 1 > PAGE) { cx = 1; cy += rowH + 1; rowH = 0; }
                    pos[gl.c] = (cx, cy);
                    cx += w + 1;
                    rowH = Math.Max(rowH, h);
                }
                g.latinPos[f.name] = pos;
                cy += rowH + 1;
            }
            pageUsed[curPage] = cy;
        }
        int pageCount = pageUsed.Count;
        for (int i = 0; i < pageCount; i++) Console.WriteLine($"page {i} used {pageUsed[i]}/{PAGE}");

        // ---- 渲染 ----
        var planFonts = new JArray();
        var pagePaths = new List<string>();
        var blankChars = new SortedSet<char>();
        var sparseChars = new SortedSet<char>();
        for (int pi = 0; pi < pageCount; pi++)
        {
            using var atlas = new Bitmap(PAGE, PAGE, PixelFormat.Format32bppArgb);
            using (var g2 = Graphics.FromImage(atlas))
            {
                g2.Clear(Color.Transparent);
                g2.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;

                foreach (var g in groups.Where(x => x.pageIndex == pi))
                {
                    // 拉丁字形搬运
                    foreach (var f in g.fonts)
                    {
                        if (!pages.TryGetValue(f.texturePage, out var page)) continue;
                        var pos = g.latinPos[f.name];
                        foreach (var gl in f.glyphs)
                        {
                            if (!pos.TryGetValue(gl.c, out var dst)) continue;
                            for (int yy = 0; yy < gl.h; yy++)
                            {
                                int sy = f.tpiY + gl.y + yy;
                                if (sy < 0 || sy >= page.Height) continue;
                                for (int xx = 0; xx < gl.w; xx++)
                                {
                                    int sx = f.tpiX + gl.x + xx;
                                    if (sx < 0 || sx >= page.Width) continue;
                                    var c = page.GetPixel(sx, sy);
                                    if (c.A > 0) atlas.SetPixel(dst.x + xx, dst.y + yy, c);
                                }
                            }
                        }
                    }
                    // CJK
                    var fc0 = LoadFont(g.ttf, g.em, g.fonts[0].bold, out var pfc1);
                    using (pfc1)
                    using (var font = fc0)
                    {
                    using var brush = new SolidBrush(Color.White);
                    using var fmt = new StringFormat(StringFormat.GenericTypographic);
                    foreach (var ch in chars)
                    {
                        var d = g.cellPos[ch];
                        RenderChar(atlas, font, brush, fmt, ch, d.x, d.y, g.em, g.baseline, g.baseRow);
                        // 墨迹审计：统计该字格内的非透明像素数，0 = 空白字形（字形丢失）
                        // 扫描范围覆盖整个字格高度（部分字符如 … 墨迹贴近基线下方）
                        int cellH = g.fonts.Min(x => x.cellH);
                        int ink = 0;
                        for (int yy = 0; yy < cellH; yy++)
                            for (int xx = 0; xx < g.em; xx++)
                            {
                                int sx = d.x + xx, sy = d.y + yy;
                                if (sx < 0 || sy < 0 || sx >= atlas.Width || sy >= atlas.Height) continue;
                                if (atlas.GetPixel(sx, sy).A > 0) ink++;
                            }
                        if (ink == 0) blankChars.Add(ch);
                        else if (ink <= 2) sparseChars.Add(ch);
                    }
                    }
                }
            }
            string ap = Path.Combine(outDir, $"atlas_{pi}.png");
            using (var fsx = new FileStream(ap, FileMode.Create)) atlas.Save(fsx, ImageFormat.Png);
            pagePaths.Add(ap);

            foreach (var g in groups.Where(x => x.pageIndex == pi))
                foreach (var f in g.fonts)
                {
                    var fo = new JObject
                    {
                        ["name"] = f.name,
                        ["index"] = f.index,
                        ["page"] = pi,
                        ["em"] = g.em,
                        ["baseline"] = g.baseline,
                        ["cellH"] = f.cellH,
                    };
                    var gl = new JArray();
                    foreach (var gg in f.glyphs)
                    {
                        if (!g.latinPos[f.name].TryGetValue(gg.c, out var d)) continue;
                        gl.Add(new JObject
                        {
                            ["c"] = gg.c, ["x"] = d.x, ["y"] = d.y, ["w"] = gg.w, ["h"] = gg.h,
                            ["shift"] = gg.shift, ["off"] = gg.off
                        });
                    }
                    fo["latin"] = gl;

                    var cgl = new JArray();
                    foreach (var ch in chars)
                    {
                        var d = g.cellPos[ch];
                        cgl.Add(new JObject
                        {
                            ["c"] = (int)ch, ["x"] = d.x, ["y"] = d.y, ["w"] = g.em,
                            ["h"] = f.cellH, ["shift"] = g.em, ["off"] = 0
                        });
                    }
                    fo["cjk"] = cgl;
                    planFonts.Add(fo);
                }
        }

        File.WriteAllText(Path.Combine(outDir, "fontplan.json"),
            new JObject
            {
                ["pageSize"] = PAGE,
                ["pages"] = JArray.FromObject(pagePaths),
                ["fonts"] = planFonts
            }.ToString(Formatting.Indented),
            new UTF8Encoding(false));
        Console.WriteLine($"atlas pages: {pageCount}");
        // ---- 墨迹审计报告 ----
        Console.WriteLine($"ink audit: blank={blankChars.Count} sparse={sparseChars.Count} / {chars.Count} chars");
        if (blankChars.Count > 0)
            Console.WriteLine("  BLANK (no ink at all): " + string.Concat(blankChars));
        if (sparseChars.Count > 0)
            Console.WriteLine("  SPARSE (<=2px): " + string.Concat(sparseChars));
        Console.WriteLine($"plan: {Path.Combine(outDir, "fontplan.json")}");
        return 0;
    }

    private static int LatinBandHeight(FontRec f)
    {
        int perRow = PAGE;
        int rows = (int)Math.Ceiling(f.glyphs.Count / (double)perRow);
        return rows * (f.cellH + 2) + 6;
    }

    // 参考字 'x' → 基线行；参考字「国」→ em 盒上沿
    private static (int asc, int desc, int baseRow) MeasureRef(Font font, StringFormat fmt)
    {
        int em = (int)Math.Round(font.Size);
        int xBot = InkBottom(font, fmt, "x", out _, out _);
        if (xBot < 0) xBot = em;
        int gTop = InkTop(font, fmt, "国", out int gBot);
        if (gBot < 0) { gTop = 0; gBot = em - 1; }
        int asc = xBot - gTop;
        int desc = gBot - xBot;
        if (asc < 1) asc = 1;
        if (desc < 0) desc = 0;
        return (asc, desc, xBot);
    }

    private static (int top, int bottom, int left, int right) RenderInk(Font font, StringFormat fmt, string s, out Bitmap tmp)
    {
        int em = (int)Math.Round(font.Size);
        tmp = new Bitmap(em * 3, em * 3, PixelFormat.Format32bppArgb);
        int top = int.MaxValue, bottom = -1, left = int.MaxValue, right = -1;
        using (var gr = Graphics.FromImage(tmp))
        {
            gr.Clear(Color.Transparent);
            gr.TextRenderingHint = CjkHint();
            gr.DrawString(s, font, Brushes.White, 0, 0, fmt);
        }
        for (int y = 0; y < tmp.Height; y++)
            for (int x = 0; x < tmp.Width; x++)
                if (tmp.GetPixel(x, y).A > 16)
                {
                    if (y < top) top = y; if (y > bottom) bottom = y;
                    if (x < left) left = x; if (x > right) right = x;
                }
        if (bottom < 0) { tmp.Dispose(); tmp = null; return (0, -1, 0, -1); }
        return (top, bottom, left, right);
    }

    private static int InkBottom(Font font, StringFormat fmt, string s, out int top, out int right)
    {
        var (t, b, l, r) = RenderInk(font, fmt, s, out Bitmap tmp);
        top = t; right = r;
        tmp?.Dispose();
        return b;
    }

    private static int InkTop(Font font, StringFormat fmt, string s, out int bottom)
    {
        var (t, b, l, r) = RenderInk(font, fmt, s, out Bitmap tmp);
        bottom = b;
        tmp?.Dispose();
        return t;
    }

    // 渲染单字：墨迹到基线的距离与渲染时保持一致
    private static void RenderChar(Bitmap atlas, Font font, Brush brush, StringFormat fmt,
                                   char ch, int dx, int dy, int em, int cellBaseline, int baseRow)
    {
        var (top, bottom, left, right) = RenderInk(font, fmt, ch.ToString(), out Bitmap tmp);
        if (tmp == null) return;
        try
        {
            int destTop = dy + cellBaseline - (baseRow - top);
            int destLeft = dx + (em - (right - left + 1)) / 2;
            for (int y = top; y <= bottom; y++)
                for (int x = left; x <= right; x++)
                {
                    var c = tmp.GetPixel(x, y);
                    if (c.A <= 0) continue;
                    int tx = destLeft + (x - left);
                    int ty = destTop + (y - top);
                    if (tx < 0 || ty < 0 || tx >= atlas.Width || ty >= atlas.Height) continue;
                    atlas.SetPixel(tx, ty, c);
                }
        }
        finally { tmp.Dispose(); }
    }

    private static string FindCjkFont()
    {
        // 可用环境变量 FE_CJK_FONT 强制指定字体文件（对比试验用）
        string env = Environment.GetEnvironmentVariable("FE_CJK_FONT");
        if (!string.IsNullOrEmpty(env))
        {
            if (!File.Exists(env)) throw new Exception("FE_CJK_FONT not found: " + env);
            return env;
        }
        // 优先黑体（笔画等宽、为屏幕设计）：宋体在 11px 下横细竖粗且带衬线，
        // 经 SingleBitPerPixelGridFit 栅格化后会大面积丢笔，表现为文字发虚/出现横线。
        string[] cands = {
            @"C:\Windows\Fonts\simhei.ttf",
            @"C:\Windows\Fonts\msyh.ttc",
            @"C:\Windows\Fonts\Deng.ttf",
            @"C:\Windows\Fonts\simsun.ttc",
        };
        foreach (var c in cands) if (File.Exists(c)) return c;
        throw new Exception("no CJK font found");
    }

    // 光栅化提示：单 bit（像素风）会在小字号下丢掉 CJK 细笔画；
    // 抗锯齿网格拟合能保留全部笔画（以灰度呈现），是 CJK 唯一可行选项。
    private static TextRenderingHint CjkHint()
    {
        string env = Environment.GetEnvironmentVariable("FE_RASTHINT");
        if (!string.IsNullOrEmpty(env))
        {
            switch (env.Trim().ToLowerInvariant())
            {
                case "single": return TextRenderingHint.SingleBitPerPixelGridFit;
                case "aa": return TextRenderingHint.AntiAlias;
                case "aagrid": return TextRenderingHint.AntiAliasGridFit;
                case "clear": return TextRenderingHint.ClearTypeGridFit;
            }
        }
        return TextRenderingHint.AntiAliasGridFit;
    }

    private static bool CjkForceBold()
    {
        string env = Environment.GetEnvironmentVariable("FE_CJK_BOLD");
        return !string.IsNullOrEmpty(env) && env.Trim() == "1";
    }
}
