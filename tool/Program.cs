using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO.Compression;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// ============================================================================
// FETool —— 《虚妄回响 / False Echo》Demo 汉化辅助工具
//   dump    : 解析 data.win，导出全部字符串 + 解码内嵌的 zlib/base64 数据块
//   apply   : 按翻译表回写 data.win（字符串 + 压缩数据块）
//   font    : 依据字体规格生成 CJK 位图字体图集与字形表
// ============================================================================

internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Length == 0) { Console.Error.WriteLine("用法: FETool <dump|apply|font> ..."); return 1; }
        switch (args[0].ToLowerInvariant())
        {
            case "dump": return Dump(args[1], args[2]);
            case "apply": return Apply(args[1], args[2], args[3]);
            case "font": return Font(args[1], args[2]);
            case "loc": return LocDump(args[1], args[2]);
            case "reloc": return LocApply(args[1], args[2], args[3]);
            case "space": return Space(args[1]);
            default: Console.Error.WriteLine("未知命令"); return 1;
        }
    }

    // ---------------------------------------------------------------- STRG 访问
    private sealed class StrgChunk
    {
        public int ChunkDataStart;       // STRG 块数据在文件中的起始偏移
        public int ChunkLength;
        public List<string> Strings = new();
        public List<long> Offsets = new();   // 绝对文件偏移（指向长度前缀）
    }

    private static StrgChunk ReadStrg(byte[] file)
    {
        var res = new StrgChunk();
        int p = 8;
        int strgData = -1;
        while (p + 8 <= file.Length)
        {
            string id = Encoding.ASCII.GetString(file, p, 4);
            int len = BitConverter.ToInt32(file, p + 4);
            if (id == "STRG") { strgData = p + 8; res.ChunkLength = len; break; }
            p += 8 + len;
        }
        if (strgData < 0) throw new Exception("未找到 STRG 块");
        res.ChunkDataStart = strgData;

        int count = BitConverter.ToInt32(file, strgData);
        for (int i = 0; i < count; i++)
            res.Offsets.Add(BitConverter.ToUInt32(file, strgData + 4 + 4 * i));

        foreach (long abs in res.Offsets)
        {
            int len = BitConverter.ToInt32(file, (int)abs);
            res.Strings.Add(len == 0 ? "" : Encoding.UTF8.GetString(file, (int)abs + 4, len));
        }
        return res;
    }

    // 猜测是否为 zlib+base64 内嵌数据块
    private static bool TryDecodeBlob(string s, out byte[] raw, out string text)
    {
        raw = null; text = null;
        if (s.Length < 40 || s.Length > 4_000_000) return false;
        foreach (char c in s)
            if (!(char.IsLetterOrDigit(c) || c == '+' || c == '/' || c == '=')) return false;

        byte[] b64;
        try { b64 = Convert.FromBase64String(s); } catch { return false; }
        if (b64.Length < 12) return false;

        // zlib: 0x78 0x9C 头 + deflate + 4 字节 adler32
        for (int skip = 0; skip <= 2; skip++)
        {
            try
            {
                using var src = new MemoryStream(b64, 2 + skip, b64.Length - 2 - skip - 4);
                using var ds = new DeflateStream(src, CompressionMode.Decompress);
                using var outMs = new MemoryStream();
                ds.CopyTo(outMs);
                byte[] plain = outMs.ToArray();
                if (plain.Length < 8) continue;
                string t = Encoding.UTF8.GetString(plain);
                if (t.Contains('\uFFFD')) continue;
                raw = plain; text = t;
                return true;
            }
            catch { }
        }
        return false;
    }

    // ------------------------------------------------------------------ dump
    private static int Dump(string dataWinPath, string outDir)
    {
        Directory.CreateDirectory(outDir);
        byte[] file = File.ReadAllBytes(dataWinPath);
        var strg = ReadStrg(file);

        var lines = new List<string>(strg.Strings.Count);
        int blobCount = 0;
        var blobIndex = new List<int>();

        for (int i = 0; i < strg.Strings.Count; i++)
        {
            string s = strg.Strings[i];
            lines.Add($"[{i}]\t{s.Replace("\r", "\\r").Replace("\n", "\\n")}");
            if (TryDecodeBlob(s, out _, out string text))
            {
                string ext = text.TrimStart().StartsWith("[") || text.TrimStart().StartsWith("{") ? "json" : "txt";
                File.WriteAllText(Path.Combine(outDir, $"blob_{i}.{ext}"), text, new UTF8Encoding(false));
                blobIndex.Add(i);
                blobCount++;
            }
        }
        File.WriteAllLines(Path.Combine(outDir, "strings.tsv"), lines, new UTF8Encoding(false));
        File.WriteAllLines(Path.Combine(outDir, "blob_index.txt"), blobIndex.Select(i => i.ToString()), new UTF8Encoding(false));

        Console.WriteLine($"字符串总数: {strg.Strings.Count}");
        Console.WriteLine($"解码出内嵌数据块: {blobCount}");
        return 0;
    }

    // ------------------------------------------------------------------ apply
    private static int Apply(string dataWinPath, string translationsPath, string outPath)
    {
        var spec = JObject.Parse(File.ReadAllText(translationsPath, Encoding.UTF8));

        byte[] file = File.ReadAllBytes(dataWinPath);
        var strg = ReadStrg(file);

        var newStrings = new List<string>(strg.Strings.Count);
        foreach (string s in strg.Strings) newStrings.Add(s);

        // 1) 普通字符串替换（按下标）
        if (spec["strings"] is JObject sobj)
        {
            foreach (var prop in sobj.Properties())
            {
                int idx = int.Parse(prop.Name);
                if (idx < 0 || idx >= newStrings.Count) { Console.Error.WriteLine($"下标越界: {idx}"); continue; }
                newStrings[idx] = prop.Value.Value<string>() ?? "";
            }
        }

        // 2) 内嵌数据块替换（按下标，值为新的明文内容）
        var blobReplacements = new Dictionary<int, string>();
        if (spec["blobs"] is JObject bobj)
            foreach (var prop in bobj.Properties())
                blobReplacements[int.Parse(prop.Name)] = prop.Value.Value<string>() ?? "";

        // 3) 重新压缩数据块
        foreach (var kv in blobReplacements)
        {
            int idx = kv.Key;
            if (idx < 0 || idx >= newStrings.Count) continue;
            byte[] plain = Encoding.UTF8.GetBytes(kv.Value);
            using var ms = new MemoryStream();
            using (var ds = new DeflateStream(ms, CompressionLevel.Optimal, true))
                ds.Write(plain, 0, plain.Length);
            byte[] deflated = ms.ToArray();
            byte[] zlib = new byte[deflated.Length + 6];
            zlib[0] = 0x78; zlib[1] = 0x9C;
            Buffer.BlockCopy(deflated, 0, zlib, 2, deflated.Length);
            uint adler = Adler32(plain);
            zlib[^4] = (byte)(adler >> 24); zlib[^3] = (byte)(adler >> 16);
            zlib[^2] = (byte)(adler >> 8); zlib[^1] = (byte)adler;
            newStrings[idx] = Convert.ToBase64String(zlib);
        }

        // 4) 重建 STRG 块并写回文件（保持除 STRG/TXTR/AUDO 外的所有块偏移不变）
        byte[] outFile = RebuildDataWin(file, strg, newStrings);
        File.WriteAllBytes(outPath, outFile);
        Console.WriteLine($"已写出: {outPath} ({outFile.Length:N0} 字节, 原 {file.Length:N0})");
        return 0;
    }

    private static uint Adler32(byte[] data)
    {
        uint a = 1, b = 0;
        foreach (byte t in data) { a = (a + t) % 65521; b = (b + a) % 65521; }
        return (b << 16) | a;
    }

    // 重建 data.win：只让 STRG 变长，其后 TXTR/AUDO 顺移，并修正其中的文件绝对偏移
    private static byte[] RebuildDataWin(byte[] file, StrgChunk strg, List<string> strings)
    {
        // 解析块表
        var chunks = new List<(string Id, int IdPos, int DataPos, int Len)>();
        int p = 8;
        while (p + 8 <= file.Length)
        {
            string id = Encoding.ASCII.GetString(file, p, 4);
            int len = BitConverter.ToInt32(file, p + 4);
            chunks.Add((id, p, p + 8, len));
            p += 8 + len;
        }

        // 构建新的字符串数据区（4 字节对齐）
        var dataArea = new MemoryStream();
        var newOffsets = new List<long>(strings.Count);
        // 字符串数据区起点：原 STRG 偏移表结束处（保持不变，偏移表长度不变）
        int tableEnd = strg.ChunkDataStart + 4 + 4 * strings.Count;
        int dataAreaStart = tableEnd;
        foreach (string s in strings)
        {
            newOffsets.Add(dataAreaStart + dataArea.Length);
            byte[] b = Encoding.UTF8.GetBytes(s);
            dataArea.Write(BitConverter.GetBytes(b.Length), 0, 4);
            dataArea.Write(b, 0, b.Length);
            int pad = (4 - (b.Length % 4)) % 4;
            for (int i = 0; i < pad; i++) dataArea.WriteByte(0);
        }
        byte[] newArea = dataArea.ToArray();
        int oldAreaLen = strg.ChunkLength - (tableEnd - strg.ChunkDataStart);
        int delta = newArea.Length - oldAreaLen;

        // 组装新文件
        using var outMs = new MemoryStream(file.Length + delta);
        outMs.Write(file, 0, strg.ChunkDataStart);
        // 偏移表
        outMs.Write(BitConverter.GetBytes(strings.Count), 0, 4);
        foreach (long off in newOffsets)
            outMs.Write(BitConverter.GetBytes((int)off), 0, 4);
        // 新数据区
        outMs.Write(newArea, 0, newArea.Length);
        // 其余块（TXTR / AUDO 需修正绝对偏移）
        int cursor = strg.ChunkDataStart + 4 + 4 * strings.Count + oldAreaLen;
        foreach (var c in chunks)
        {
            if (c.DataPos <= strg.ChunkDataStart) continue; // 已处理
            byte[] body = new byte[c.Len];
            Array.Copy(file, c.DataPos, body, 0, c.Len);
            if (c.Id is "TXTR" or "AUDO")
                FixAbsoluteOffsets(c.Id, body, delta, c.DataPos);
            outMs.Write(Encoding.ASCII.GetBytes(c.Id), 0, 4);
            outMs.Write(BitConverter.GetBytes(c.Len), 0, 4);
            outMs.Write(body, 0, c.Len);
            cursor = c.DataPos + c.Len;
        }

        byte[] result = outMs.ToArray();
        // 更新 FORM 长度
        BitConverter.GetBytes(result.Length - 8).CopyTo(result, 4);
        // 更新 STRG 块长度
        foreach (var c in chunks)
        {
            if (c.Id == "STRG")
            {
                int newLen = c.Len + delta;
                BitConverter.GetBytes(newLen).CopyTo(result, c.IdPos + 4);
            }
        }
        return result;
    }

    // 修正 TXTR / AUDO 块内的文件绝对偏移
    private static void FixAbsoluteOffsets(string id, byte[] body, int delta, int chunkDataStart)
    {
        if (id == "TXTR")
        {
            int count = BitConverter.ToInt32(body, 0);
            for (int i = 0; i < count; i++)
            {
                int off = BitConverter.ToInt32(body, 4 + 4 * i);
                if (off > 0) BitConverter.GetBytes(off + delta).CopyTo(body, 4 + 4 * i);
            }
        }
        else if (id == "AUDO")
        {
            // AUDO: count + 偏移表 + 每项描述
            int count = BitConverter.ToInt32(body, 0);
            for (int i = 0; i < count; i++)
            {
                int off = BitConverter.ToInt32(body, 4 + 4 * i);
                if (off > 0) BitConverter.GetBytes(off + delta).CopyTo(body, 4 + 4 * i);
            }
        }
    }

    // ------------------------------------------------------- 本地化表 (CSV 表)
    // 把 [[key, value], ...] 形式的 JSON 导出为 TSV（键\t原文）
    private static int LocDump(string jsonPath, string outPath)
    {
        var arr = JArray.Parse(File.ReadAllText(jsonPath, Encoding.UTF8));
        var lines = new List<string>(arr.Count);
        int multi = 0;
        foreach (var row in arr)
        {
            var cells = row.ToObject<List<string>>() ?? new List<string>();
            if (cells.Count > 2) multi++;
            lines.Add(string.Join("\t", cells.Select(c => (c ?? "").Replace("\r", "\\r").Replace("\n", "\\n"))));
        }
        File.WriteAllLines(outPath, lines, new UTF8Encoding(false));
        Console.WriteLine($"{Path.GetFileName(jsonPath)}: {arr.Count} 行 (多列行 {multi})");
        return 0;
    }

    // 把 TSV 译文合并回 [[key, value], ...] JSON
    // 译文中的 "\n" 表示一个段落分隔；工具会用原文对应位置的换行数量来还原排版间距
    private static int LocApply(string tsvPath, string jsonPath, string outPath)
    {
        var map = new Dictionary<string, string>();
        foreach (string line in File.ReadAllLines(tsvPath, Encoding.UTF8))
        {
            if (line.Length == 0) continue;
            int tab = line.IndexOf('\t');
            if (tab <= 0) continue;
            string key = line[..tab];
            string val = line[(tab + 1)..].Replace("\\r", "\r").Replace("\\n", "\n");
            if (val.Length == 0) continue;
            map[key] = val;
        }

        var arr = JArray.Parse(File.ReadAllText(jsonPath, Encoding.UTF8));
        int hit = 0, miss = 0;
        foreach (var row in arr)
        {
            var cells = row.ToObject<List<string>>() ?? new List<string>();
            if (cells.Count < 2) continue;
            if (map.TryGetValue(cells[0], out string nv))
            {
                cells[1] = MergeLayout(cells[1], nv);
                hit++;
            }
            else miss++;
            var jrow = (JArray)row;
            jrow.RemoveAll();
            foreach (var c in cells) jrow.Add(c);
        }
        File.WriteAllText(outPath, arr.ToString(Formatting.None), new UTF8Encoding(false));
        Console.WriteLine($"{Path.GetFileName(jsonPath)}: 命中 {hit} / 未命中 {miss}");
        return 0;
    }

    // 依据原文的换行分布，为译文还原相同的排版间距
    private static string MergeLayout(string original, string translation)
    {
        if (original.IndexOf('\r') < 0 && original.IndexOf('\n') < 0)
            return translation.Replace("\n", "\r\n");

        // 原文：按连续的 \r\n 切分，记录每段之间有多少个 \r\n
        var origSegs = new List<string>();
        var origRuns = new List<int>();
        {
            int pos = 0;
            while (true)
            {
                int m = original.IndexOf("\r\n", pos, StringComparison.Ordinal);
                if (m < 0) { origSegs.Add(original[pos..]); break; }
                origSegs.Add(original[pos..m]);
                int count = 0;
                int q = m;
                while (q + 1 < original.Length && original[q] == '\r' && original[q + 1] == '\n') { count++; q += 2; }
                origRuns.Add(count);
                pos = q;
            }
        }

        // 译文：按 \n 切分
        var newSegs = translation.Split('\n');

        var sb = new StringBuilder();
        for (int i = 0; i < newSegs.Length; i++)
        {
            sb.Append(newSegs[i]);
            if (i < newSegs.Length - 1)
            {
                int run = origRuns.Count == 0 ? 1 : origRuns[Math.Min(i, origRuns.Count - 1)];
                for (int k = 0; k < run; k++) sb.Append("\r\n");
            }
        }
        return sb.ToString();
    }

    // ------------------------------------------------------- 纹理页空闲空间分析
    private static int Space(string dir)
    {
        foreach (string f in Directory.GetFiles(dir, "*.png").OrderBy(x => x))
        {
            using var bmp = new Bitmap(f);
            int w = bmp.Width, h = bmp.Height;
            int maxX = -1, maxY = -1;
            var rect = new Rectangle(0, 0, w, h);
            var data = bmp.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            byte[] buf = new byte[stride * h];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, buf.Length);
            bmp.UnlockBits(data);
            for (int y = 0; y < h; y++)
            {
                int rowBase = y * stride;
                for (int x = 0; x < w; x++)
                {
                    if (buf[rowBase + x * 4 + 3] != 0)
                    {
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            long used = (long)(maxX + 1) * (maxY + 1);
            Console.WriteLine($"{Path.GetFileName(f),-14} {w}x{h}  内容包围盒=({maxX},{maxY})  右下空白区={w - maxX - 1}x{h - maxY - 1}  占用率={100.0 * used / (w * h):F1}%");
            LargestFreeRect(buf, stride, w, h, out int fx, out int fy, out int fw, out int fh);
            Console.WriteLine($"               最大全透明矩形: ({fx},{fy}) {fw}x{fh}");
        }
        return 0;
    }

    // 用柱状图法求最大全透明矩形
    private static void LargestFreeRect(byte[] buf, int stride, int w, int h, out int bx, out int by, out int bw, out int bh)
    {
        int[] heights = new int[w];
        bx = by = bw = bh = 0;
        for (int y = 0; y < h; y++)
        {
            int rowBase = y * stride;
            for (int x = 0; x < w; x++)
                heights[x] = buf[rowBase + x * 4 + 3] == 0 ? heights[x] + 1 : 0;

            var stack = new System.Collections.Generic.Stack<int>();
            for (int x = 0; x <= w; x++)
            {
                int cur = (x == w) ? 0 : heights[x];
                while (stack.Count > 0 && heights[stack.Peek()] >= cur)
                {
                    int top = stack.Pop();
                    int height = heights[top];
                    int left = stack.Count > 0 ? stack.Peek() + 1 : 0;
                    int width = x - left;
                    if ((long)height * width > (long)bh * bw)
                    {
                        bh = height; bw = width; bx = left; by = y - height + 1;
                    }
                }
                stack.Push(x);
            }
        }
    }

    // ------------------------------------------------------------------ font
    private static int Font(string specPath, string outDir)
    {
        Directory.CreateDirectory(outDir);
        var spec = JObject.Parse(File.ReadAllText(specPath, Encoding.UTF8));
        // spec: { "fonts": [ { "name": "...", "size": 16, "aa": true, "chars": ["汉", ...], "ttf": "C:\\Windows\\Fonts\\simhei.ttf" } ] }
        var results = new JArray();

        foreach (var f in (JArray)spec["fonts"]!)
        {
            string name = f["name"]!.Value<string>()!;
            int size = f["size"]!.Value<int>();
            bool aa = f["aa"]?.Value<bool>() ?? true;
            string ttfPath = f["ttf"]!.Value<string>()!;
            var chars = f["chars"]!.ToObject<List<string>>()!;
            var charSet = new List<string>();
            foreach (var c in chars) charSet.Add(c);

            var (png, glyphs) = BuildAtlas(charSet, size, aa, ttfPath);
            string pngPath = Path.Combine(outDir, name + ".png");
            File.WriteAllBytes(pngPath, png);
            results.Add(new JObject
            {
                ["name"] = name,
                ["png"] = name + ".png",
                ["glyphs"] = JArray.FromObject(glyphs)
            });
            Console.WriteLine($"{name}: {glyphs.Count} 个字形, 图集 {png.Length / 1024} KB");
        }

        File.WriteAllText(Path.Combine(outDir, "fonts.json"), results.ToString(Formatting.Indented), new UTF8Encoding(false));
        return 0;
    }

    private sealed class GlyphInfo
    {
        public string Character = "";
        public int X, Y, W, H, Shift, Offset;
    }

    private static (byte[] png, List<GlyphInfo> glyphs) BuildAtlas(List<string> chars, int size, bool aa, string ttfPath)
    {
        // 使用 GDI+ 测量并渲染
        using var bmpTmp = new Bitmap(1, 1);
        using (var g = Graphics.FromImage(bmpTmp))
        {
            g.TextRenderingHint = aa ? TextRenderingHint.AntiAliasGridFit : TextRenderingHint.SingleBitPerPixelGridFit;
        }
        var font = new Font(ttfPath, size, FontStyle.Regular, GraphicsUnit.Pixel);
        var fontBrush = new SolidBrush(Color.White);
        var format = new StringFormat(StringFormat.GenericTypographic);

        var glyphs = new List<GlyphInfo>();
        int atlasW = 512;
        int x = 0, y = 0, rowH = 0;
        var placements = new List<(string ch, int x, int y, int w, int h, int shift, int off)>();

        using (var meas = new Bitmap(1, 1))
        using (var mg = Graphics.FromImage(meas))
        {
            mg.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            foreach (string ch in chars)
            {
                SizeF sz = mg.MeasureString(ch, font, int.MaxValue, format);
                int gw = Math.Max(1, (int)Math.Ceiling(sz.Width));
                int gh = Math.Max(1, (int)Math.Ceiling(sz.Height));
                int adv = (int)Math.Round(mg.MeasureString(ch, font, int.MaxValue, format).Width);
                if (x + gw + 1 > atlasW) { x = 0; y += rowH + 1; rowH = 0; }
                placements.Add((ch, x, y, gw, gh, adv, 0));
                x += gw + 1;
                rowH = Math.Max(rowH, gh);
            }
        }

        int atlasH = y + rowH + 2;
        atlasH = (atlasH + 3) & ~3;
        using var atlas = new Bitmap(atlasW, atlasH, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(atlas))
        {
            g.Clear(Color.Transparent);
            g.TextRenderingHint = aa ? TextRenderingHint.AntiAliasGridFit : TextRenderingHint.SingleBitPerPixelGridFit;
            g.TextRenderingHint = aa ? TextRenderingHint.AntiAliasGridFit : TextRenderingHint.SingleBitPerPixelGridFit;
            foreach (var pl in placements)
            {
                var sf = new StringFormat(StringFormat.GenericTypographic);
                g.DrawString(pl.ch, font, fontBrush, pl.x, pl.y, sf);
                glyphs.Add(new GlyphInfo { Character = pl.ch, X = pl.x, Y = pl.y, W = pl.w, H = pl.h, Shift = pl.shift, Offset = pl.off });
            }
        }

        using var outMs = new MemoryStream();
        atlas.Save(outMs, ImageFormat.Png);
        return (outMs.ToArray(), glyphs);
    }
}
