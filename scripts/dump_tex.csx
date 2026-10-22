using System;
using System.IO;
string outDir = @"E:\FalseEcho_CN\out\tex";
Directory.CreateDirectory(outDir);
for (int i = 0; i < Data.EmbeddedTextures.Count; i++)
{
    var t = Data.EmbeddedTextures[i];
    string nm = t.Name.Content;
    byte[] blob = null;
    try { blob = t.TextureData.TextureBlob; } catch (Exception e) { Console.WriteLine("ERR " + i + " " + e.GetType().Name); }
    if (blob == null) { Console.WriteLine(i + " " + nm + " : no blob"); continue; }
    string p = Path.Combine(outDir, i + "_" + nm + ".bin");
    File.WriteAllBytes(p, blob);
    Console.WriteLine(i + " " + nm + " -> " + blob.Length + " bytes head=" + BitConverter.ToString(blob, 0, Math.Min(8, blob.Length)));
}
