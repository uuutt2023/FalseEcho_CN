using System.Reflection;

var asm = Assembly.LoadFrom(@"E:\FalseEcho_CN\tools\utmt\Underanalyzer.dll");
Console.WriteLine("Assembly: " + asm.FullName);

var types = asm.GetTypes();
Console.WriteLine("Types containing 'Decompiler':");
foreach (var t in types.Where(t => t.FullName.Contains("Decompiler")).OrderBy(t => t.FullName))
    Console.WriteLine("  " + t.FullName + (t.IsPublic ? " [public]" : " [internal]"));

Console.WriteLine();
Console.WriteLine("=== Decompiler methods ===");
foreach (var t in types.Where(t => t.Name == "Decompiler" && t.IsPublic))
{
    Console.WriteLine("TYPE " + t.FullName);
    foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly))
        Console.WriteLine("   " + m.ReturnType.Name + " " + m.Name + "(" +
            string.Join(", ", m.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name)) + ")");
}

Console.WriteLine();
Console.WriteLine("=== GlobalDecompilerContext ctors ===");
foreach (var t in types.Where(t => t.Name.Contains("GlobalDecompilerContext")))
{
    Console.WriteLine("TYPE " + t.FullName + " public=" + t.IsPublic);
    foreach (var c in t.GetConstructors())
        Console.WriteLine("   ctor(" + string.Join(", ", c.GetParameters().Select(p => p.ParameterType.Name + " " + p.Name)) + ")");
}

Console.WriteLine();
Console.WriteLine("=== IDecompileSettings implementors ===");
foreach (var t in types.Where(t => t.Name.Contains("DecompileSettings") || t.Name.Contains("IDecompileSettings")))
    Console.WriteLine("  " + t.FullName + " public=" + t.IsPublic);
