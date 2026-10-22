using System.IO;
using System.Text;
string outDir = @"E:\\FalseEcho_CN\\out\\dw_dump";
int[] idx = new int[] { 2563,  2568,  2570,  2576,  2577,  2578,  2579,  2580,  2581 };
foreach (int i in idx) {
    string p = System.IO.Path.Combine(outDir, i.ToString() + ".b64");
    System.IO.File.WriteAllText(p, Data.Strings[i].Content, new UTF8Encoding(false));
}
Console.WriteLine("DUMPED " + idx.Length);
