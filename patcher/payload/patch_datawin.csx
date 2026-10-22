// ============================================================================
// patch_datawin.csx -- rebuild data.win with the Chinese localization
//   UndertaleModCli load <data.win> -s patch_datawin.csx -o <out> -f
//   env: FE_PAYLOAD_DIR  -> folder that holds blobs.json / fontplan.json / atlas_*.png
//
// This is the distributable-patcher version of scripts/apply_all.csx:
//   1) replace the 9 baked text blocks in the STRG chunk with the Chinese payloads
//   2) add the CJK glyph atlas pages and re-point the 12 fonts at them
// ============================================================================
using System.IO.Compression;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

string payloadDir = Environment.GetEnvironmentVariable("FE_PAYLOAD_DIR");
if (string.IsNullOrEmpty(payloadDir)) payloadDir = Path.GetDirectoryName(Environment.GetCommandLineArgs()[0]);
Console.WriteLine("payload dir = " + payloadDir);

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
    {
        ds.Write(data, 0, data.Length);
    }
    return ms.ToArray();
}

// ---------------------------------------------------------------- 1. text blocks
var blobs = JObject.Parse(File.ReadAllText(Path.Combine(payloadDir, "blobs.json"), Encoding.UTF8));
int blobOk = 0, blobFail = 0;
foreach (var prop in blobs.Properties())
{
    int idx = int.Parse(prop.Name);
    if (idx < 0 || idx >= Data.Strings.Count) { Console.WriteLine("!! index out of range " + idx); blobFail++; continue; }
    string orig = Data.Strings[idx].Content;
    try
    {
        byte[] raw = ZlibInflate(Convert.FromBase64String(orig));
        string origText = new UTF8Encoding(false).GetString(raw);
        byte[] newRaw = new UTF8Encoding(false).GetBytes(prop.Value.Value<string>());
        byte[] newZ = ZlibDeflate(newRaw);
        string newB64 = Convert.ToBase64String(newZ);
        byte[] check = ZlibInflate(Convert.FromBase64String(newB64));
        string checkText = new UTF8Encoding(false).GetString(check);
        if (checkText != prop.Value.Value<string>()) { Console.WriteLine("!! self check failed " + idx); blobFail++; continue; }
        Data.Strings[idx].Content = newB64;
        Console.WriteLine($"blob {idx}: {orig.Length} -> {newB64.Length} chars (plain {origText.Length} -> {checkText.Length})");
        blobOk++;
    }
    catch (Exception e) { Console.WriteLine("!! blob " + idx + " failed: " + e.Message); blobFail++; }
}
Console.WriteLine($"text blocks: ok {blobOk}, failed {blobFail}");

// ---------------------------------------------------------------- 2. fonts
var plan = JObject.Parse(File.ReadAllText(Path.Combine(payloadDir, "fontplan.json"), Encoding.UTF8));
int pageSize = plan["pageSize"].Value<int>();
var pageFiles = (JArray)plan["pages"];
Console.WriteLine("=== new atlas pages ===");
var newPages = new List<UndertaleModLib.Models.UndertaleEmbeddedTexture>();
foreach (var pf in pageFiles)
{
    string path = Path.Combine(payloadDir, pf.ToString());
    var page = new UndertaleModLib.Models.UndertaleEmbeddedTexture();
    page.Name = Data.Strings.MakeString("Texture_CN_" + newPages.Count);
    byte[] png = File.ReadAllBytes(path);
    var img = UndertaleModLib.Util.GMImage.FromPng(png, true);
    page.TextureData.Image = img;
    Data.EmbeddedTextures.Add(page);
    newPages.Add(page);
    Console.WriteLine($"  page {newPages.Count - 1}: {path} ({png.Length / 1024} KB)");
}

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

Console.WriteLine("=== apply glyphs ===");
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
    if (font == null) { Console.WriteLine("  !! font not found: " + name); fontFail++; continue; }
    {
        int emPx = fo["em"] != null ? fo["em"].Value<int>() : 0;
        uint wantLH = (uint)(emPx + 2);
        if (wantLH > font.LineHeight)
        {
            Console.WriteLine($"  {name}: LineHeight {font.LineHeight} -> {wantLH}");
            font.LineHeight = wantLH;
        }
    }
    try
    {
        var tpi = pageItems[pageIdx];
        var latin = (JArray)fo["latin"];
        var cjk = (JArray)fo["cjk"];
        var planGlyphs = new Dictionary<int, JObject>();
        foreach (var g in latin) planGlyphs[g["c"].Value<int>()] = (JObject)g;
        foreach (var g in cjk) planGlyphs[g["c"].Value<int>()] = (JObject)g;

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
                kept.Add(gl); updated++;
            }
            else dropped++;
        }
        font.Glyphs.Clear();
        foreach (var gl in kept) font.Glyphs.Add(gl);

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

        int maxChar = 0;
        foreach (var g in font.Glyphs) if (g.Character > maxChar) maxChar = g.Character;
        if ((uint)maxChar > font.RangeEnd) font.RangeEnd = (uint)maxChar;

        font.Texture = tpi;
        Console.WriteLine($"  {name}: {font.Glyphs.Count} glyphs (updated {updated}, dropped {dropped}), range {font.RangeStart}-{font.RangeEnd}");
        fontOk++;
    }
    catch (Exception e) { Console.WriteLine("  !! font " + name + " failed: " + e.Message); fontFail++; }
}
Console.WriteLine($"fonts: ok {fontOk}, failed {fontFail}");
Console.WriteLine("OK");
