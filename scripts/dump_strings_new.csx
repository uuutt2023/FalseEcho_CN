using System.IO;
using System.Text;
string outDir = @"E:\FalseEcho_CN\newbuild";
Directory.CreateDirectory(outDir);
using (var w = new StreamWriter(Path.Combine(outDir, "strings.tsv"), false, new UTF8Encoding(false)))
{
    for (int i = 0; i < Data.Strings.Count; i++)
    {
        string c = Data.Strings[i].Content;
        if (c == null) c = "";
        c = c.Replace("\r", "\\r").Replace("\n", "\\n");
        w.WriteLine("[" + i + "]\t" + c);
    }
}
Console.WriteLine("STRINGS " + Data.Strings.Count);
