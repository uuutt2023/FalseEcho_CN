// Decompile all GML code (scripts + object events) to E:\FalseEcho_CN\gml\
System.IO.Directory.CreateDirectory("E:\\FalseEcho_CN\\gml");
System.IO.Directory.CreateDirectory("E:\\FalseEcho_CN\\gml\\obj");

var gctx = new UndertaleModLib.Decompiler.GlobalDecompileContext(Data, new StubGlobalFunctions());
var settings = new Underanalyzer.Decompiler.DecompileSettings();

int ok = 0, fail = 0;

string Decompile(Underanalyzer.IGMCode code)
{
    var dc = new Underanalyzer.Decompiler.DecompileContext(gctx, code, settings);
    return dc.DecompileToString();
}

string Clean(string n)
{
    if (n == null) return "unnamed";
    return n.Replace(":", "-").Replace("\\", "-").Replace("/", "-").Replace("*", "-").Replace("?", "-").Replace("\"", "'");
}

// ---- Scripts ----
int si = 0;
foreach (var s in Data.Scripts)
{
    string nm = "script_" + si.ToString("D4");
    try { nm += "_" + Clean(s.Name.ToString()); } catch (Exception e2) { }
    try
    {
        string src = "";
        if (s.Code != null) src = Decompile(s.Code);
        System.IO.File.WriteAllText("E:\\FalseEcho_CN\\gml\\" + nm + ".gml", src);
        ok++;
    }
    catch (Exception e)
    {
        try { System.IO.File.WriteAllText("E:\\FalseEcho_CN\\gml\\" + nm + ".ERR.txt", e.ToString()); } catch (Exception e3) { }
        fail++;
    }
    si++;
}

// ---- Object events ----
int oi = 0;
foreach (var o in Data.GameObjects)
{
    string nm = "obj_" + oi.ToString("D4");
    try { nm += "_" + Clean(o.Name.ToString()); } catch (Exception e2) { }
    try
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("// ===== OBJECT: " + nm + " =====");
        int grp = 0;
        foreach (var grpList in o.Events)
        {
            foreach (var ev in grpList)
            {
                sb.AppendLine("// -- EVENT grp=" + grp);
                try
                {
                    foreach (var act in ev.Actions)
                    {
                        if (act.CodeId == null) continue;
                        sb.AppendLine(Decompile(act.CodeId));
                    }
                }
                catch (Exception ee)
                {
                    sb.AppendLine("// ERR " + ee.Message);
                }
            }
            grp++;
        }
        System.IO.File.WriteAllText("E:\\FalseEcho_CN\\gml\\obj\\" + nm + ".gml", sb.ToString());
        ok++;
    }
    catch (Exception e)
    {
        fail++;
    }
    oi++;
}

Console.WriteLine("scripts=" + si + " objects=" + oi + " ok=" + ok + " fail=" + fail);

public class StubGlobalFunctions : Underanalyzer.Decompiler.IGlobalFunctions
{
    public bool FunctionNameExists(string name) { return false; }
    public bool FunctionExists(Underanalyzer.IGMFunction function) { return false; }
    public bool TryGetFunction(string name, out Underanalyzer.IGMFunction function) { function = null; return false; }
    public bool TryGetFunctionName(Underanalyzer.IGMFunction function, out string name) { name = null; return false; }
}
