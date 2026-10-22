// ============================================================================
// apply_all.csx —— 一次性写回：本地化文本 + CJK 字体
//   用法: UndertaleModCli load <data.win> -s apply_all.csx -o <out> -f
// ============================================================================
using System.IO.Compression;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

string workDir = @"E:\FalseEcho_CN\apply";
string fontDir = Environment.GetEnvironmentVariable("FE_FONT_DIR");
if (string.IsNullOrEmpty(fontDir)) fontDir = @"E:\FalseEcho_CN\fontout_cn4";

// ---------------------------------------------------------------- 工具函数
byte[] ZlibInflate(byte[] data)
{
    using var ms = new MemoryStream(data);
    using var ds = new ZLibStream(ms, CompressionMode.Decompress);
    using var outMs = new MemoryStream();
    ds.CopyTo(outMs);
    return outMs.ToArray();
}

byte[] ZlibDeflate(byte[] data)
{
    using var ms = new MemoryStream();
    using (var ds = new ZLibStream(ms, CompressionLevel.Optimal, true))
        ds.Write(data, 0, data.Length);
    return ms.ToArray();
}

// ---------------------------------------------------------------- 1. 本地化文本
var blobs = JObject.Parse(File.ReadAllText(Path.Combine(workDir, "blobs.json"), Encoding.UTF8));
int blobOk = 0, blobFail = 0;
foreach (var prop in blobs.Properties())
{
    int idx = int.Parse(prop.Name);
    if (idx < 0 || idx >= Data.Strings.Count) { Console.WriteLine("!! 下标越界 " + idx); blobFail++; continue; }
    string orig = Data.Strings[idx].Content;
    try
    {
        // 自检：解码原串 → 再编码 → 应能还原（验证 zlib/base64 通路）
        byte[] raw = ZlibInflate(Convert.FromBase64String(orig));
        string origText = new UTF8Encoding(false).GetString(raw);
        byte[] newRaw = new UTF8Encoding(false).GetBytes(prop.Value.Value<string>());
        byte[] newZ = ZlibDeflate(newRaw);
        string newB64 = Convert.ToBase64String(newZ);
        // 自检：新串能解开且内容一致
        byte[] check = ZlibInflate(Convert.FromBase64String(newB64));
        string checkText = new UTF8Encoding(false).GetString(check);
        if (checkText != prop.Value.Value<string>()) { Console.WriteLine("!! 自检失败 " + idx); blobFail++; continue; }
        Data.Strings[idx].Content = newB64;
        Console.WriteLine($"blob {idx}: 原 {orig.Length} 字符 → 新 {newB64.Length} 字符 (明文 {origText.Length} → {checkText.Length})");
        blobOk++;
    }
    catch (Exception e)
    {
        Console.WriteLine("!! blob " + idx + " 失败: " + e.Message);
        blobFail++;
    }
}
Console.WriteLine($"文本块替换: 成功 {blobOk}, 失败 {blobFail}");

// ---------------------------------------------------------------- 2. 字体
var plan = JObject.Parse(File.ReadAllText(Path.Combine(fontDir, "fontplan.json"), Encoding.UTF8));
int pageSize = plan["pageSize"].Value<int>();
var pageFiles = (JArray)plan["pages"];

Console.WriteLine("=== 新增纹理页 ===");
var newPages = new List<UndertaleModLib.Models.UndertaleEmbeddedTexture>();
foreach (var pf in pageFiles)
{
    string path = pf.ToString();
    var page = new UndertaleModLib.Models.UndertaleEmbeddedTexture();
    page.Name = Data.Strings.MakeString("Texture_CN_" + newPages.Count);
    byte[] png = File.ReadAllBytes(path);
    var img = UndertaleModLib.Util.GMImage.FromPng(png, true);
    page.TextureData.Image = img;
    Data.EmbeddedTextures.Add(page);
    newPages.Add(page);
    Console.WriteLine($"  新页 {newPages.Count - 1}: {path} ({png.Length / 1024} KB)");
}

// 每个字体一张覆盖整页的页项
var pageItems = new List<UndertaleModLib.Models.UndertaleTexturePageItem>();
foreach (var page in newPages)
{
    var tpi = new UndertaleModLib.Models.UndertaleTexturePageItem();
    tpi.Name = Data.Strings.MakeString("PageItem_CN_" + pageItems.Count);
    tpi.SourceX = 0; tpi.SourceY = 0;
    tpi.SourceWidth = (ushort)pageSize; tpi.SourceHeight = (ushort)pageSize;
    tpi.TargetX = 0; tpi.TargetY = 0;
    tpi.TargetWidth = (ushort)pageSize; tpi.TargetHeight = (ushort)pageSize;
    tpi.BoundingWidth = (ushort)pageSize; tpi.BoundingHeight = (ushort)pageSize;
    tpi.TexturePage = page;
    Data.TexturePageItems.Add(tpi);
    pageItems.Add(tpi);
}

Console.WriteLine("=== 应用字体字形 ===");
int fontOk = 0, fontFail = 0;
foreach (var fo in (JArray)plan["fonts"])
{
    string name = fo["name"].Value<string>();
    int pageIdx = fo["page"].Value<int>();
    int cellH = fo["cellH"].Value<int>();
    UndertaleModLib.Models.UndertaleFont font = null;
    for (int fi = 0; fi < Data.Fonts.Count; fi++)
    {
        var ff = Data.Fonts[fi];
        if (ff != null && ff.Name != null && ff.Name.Content == name) { font = ff; break; }
    }
    if (font == null) { Console.WriteLine("  !! 找不到字体 " + name); fontFail++; continue; }
    // 行高必须容得下 CJK 墨迹（点阵字体 CJK 墨迹高 ≈ em-1）并留出 2px 行间空隙。
    // 原版正文字体 LineHeight=9 是为拉丁墨迹(≈7px)设计的，换成 CJK 后行盒被填满，
    // 多行文字会互相压叠（电传打字机纸面、任务简报实测重叠）。故按 em+2 抬升。
    {
        int emPx = fo["em"] != null ? fo["em"].Value<int>() : 0;
        uint wantLH = (uint)(emPx + 2);
        if (wantLH > font.LineHeight)
        {
            Console.WriteLine($"  {name}: LineHeight {font.LineHeight} -> {wantLH} (em={emPx})");
            font.LineHeight = wantLH;
        }
    }
    try
    {
        var tpi = pageItems[pageIdx];

        // 1) 汇总 plan 中的全部字形元数据（latin = 原字形，cjk = 新增 CJK）
        var latin = (JArray)fo["latin"];
        var cjk = (JArray)fo["cjk"];
        var planGlyphs = new Dictionary<int, JObject>();
        foreach (var g in latin) planGlyphs[g["c"].Value<int>()] = (JObject)g;
        foreach (var g in cjk) planGlyphs[g["c"].Value<int>()] = (JObject)g;

        // 2) 更新所有已存在字形的度量与取样位置（拉丁与 CJK 一视同仁），
        //    并丢弃 plan 中已不存在的残留字形（上一轮构建遗留的 CJK）。
        //    注意：不能像旧版那样「跳过已存在的码位」——那会让字形元数据停留在
        //    上一轮的 em/advance 上，而图集已换成新一轮，造成字形与元数据错配。
        var kept = new List<UndertaleModLib.Models.UndertaleFont.Glyph>();
        int dropped = 0, updated = 0;
        foreach (var gl in font.Glyphs)
        {
            if (planGlyphs.TryGetValue(gl.Character, out var pg))
            {
                gl.SourceX = (ushort)pg["x"].Value<int>();
                gl.SourceY = (ushort)pg["y"].Value<int>();
                gl.SourceWidth = (ushort)pg["w"].Value<int>();
                gl.SourceHeight = (ushort)pg["h"].Value<int>();
                gl.Shift = (short)pg["shift"].Value<int>();
                gl.Offset = (short)pg["off"].Value<int>();
                kept.Add(gl);
                updated++;
            }
            else dropped++;
        }
        font.Glyphs.Clear();
        foreach (var gl in kept) font.Glyphs.Add(gl);

        // 3) 新增 plan 中尚未存在的 CJK 字形，按码位升序插入
        var byChar = new Dictionary<int, UndertaleModLib.Models.UndertaleFont.Glyph>();
        foreach (var g in font.Glyphs) byChar[g.Character] = g;
        var toAdd = new List<JObject>();
        foreach (var g in cjk)
        {
            int c = g["c"].Value<int>();
            if (byChar.ContainsKey(c)) continue;
            toAdd.Add((JObject)g);
        }
        toAdd.Sort((a, b) => a["c"].Value<int>().CompareTo(b["c"].Value<int>()));

        // 现有字形按码位升序（应为真）；逐个插入时从大到小，避免下标错位
        var existing = new List<int>(byChar.Keys);
        existing.Sort();
        for (int i = toAdd.Count - 1; i >= 0; i--)
        {
            var g = toAdd[i];
            int c = g["c"].Value<int>();
            int pos = 0;
            while (pos < font.Glyphs.Count && font.Glyphs[pos].Character < c) pos++;
            var ng = new UndertaleModLib.Models.UndertaleFont.Glyph();
            ng.Character = (ushort)c;
            ng.SourceX = (ushort)g["x"].Value<int>();
            ng.SourceY = (ushort)g["y"].Value<int>();
            ng.SourceWidth = (ushort)g["w"].Value<int>();
            ng.SourceHeight = (ushort)g["h"].Value<int>();
            ng.Shift = (short)g["shift"].Value<int>();
            ng.Offset = (short)g["off"].Value<int>();
            font.Glyphs.Insert(pos, ng);
        }

        // 3) 扩大字符范围
        int maxChar = 0;
        foreach (var g in font.Glyphs) if (g.Character > maxChar) maxChar = g.Character;
        if ((uint)maxChar > font.RangeEnd) font.RangeEnd = (uint)maxChar;

        // 4) 指向新页
        font.Texture = tpi;

        Console.WriteLine($"  {name}: 字形 {font.Glyphs.Count} 个 (更新 {updated}, 丢弃残留 {dropped}), 范围 {font.RangeStart}-{font.RangeEnd}, 指向新页 {pageIdx}");
        fontOk++;
    }
    catch (Exception e)
    {
        Console.WriteLine("  !! 字体 " + name + " 失败: " + e.Message);
        fontFail++;
    }
}
Console.WriteLine($"字体处理: 成功 {fontOk}, 失败 {fontFail}");
Console.WriteLine("OK");

