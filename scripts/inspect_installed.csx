// Inspect the installed data.win: chunk layout, localization blobs, and any
// second (plain-text) copy of the localization table.
using System.Text;
using System.IO.Compression;

Console.WriteLine($"STRG count = {Data.Strings.Count}");

Console.WriteLine("\n=== 2575..2579 块内容 ===");
for (int i = 2575; i <= 2579; i++)
{
    string s = Data.Strings[i].Content;
    string head = s.Length > 60 ? s.Substring(0, 60) : s;
    string dec = "";
    if (s.Length > 100 && s.TrimEnd().Length % 4 == 0)
    {
        try
        {
            using var ms = new MemoryStream(Convert.FromBase64String(s.Trim()));
            using var ds = new ZLibStream(ms, CompressionMode.Decompress);
            using var o = new MemoryStream();
            ds.CopyTo(o);
            var t = new UTF8Encoding(false).GetString(o.ToArray());
            dec = t.Substring(0, Math.Min(200, t.Length));
        }
        catch (Exception e) { dec = "INFLATE FAIL: " + e.Message; }
    }
    Console.WriteLine($"[{i}] raw={s.Length} head={head}");
    Console.WriteLine($"     decoded={dec}");
}

Console.WriteLine("\n=== 查找本地化键/值在 STRG 中的位置 ===");
string[] probes = { "txt_wrn_subtitle", "STATE SECURITY DIRECTORATE", "txt_ui_gen_back", "BACK",
                    "txt_ui_gen_sett_title", "txt_ui_gen_graphics", "txt_ui_mm_btn_newgame" };
foreach (var p in probes)
{
    var hits = new List<int>();
    for (int i = 0; i < Data.Strings.Count; i++)
        if (Data.Strings[i].Content == p) hits.Add(i);
    Console.WriteLine($"  {p,-30} -> [{string.Join(",", hits)}]");
}

Console.WriteLine("\n=== 含 'txt_ui_gen_' 前缀的 STRG 字符串数量 ===");
int n = 0;
for (int i = 0; i < Data.Strings.Count; i++)
    if (Data.Strings[i].Content.StartsWith("txt_") || Data.Strings[i].Content.StartsWith("day_99_")) n++;
Console.WriteLine("  " + n);
Console.WriteLine("OK");
