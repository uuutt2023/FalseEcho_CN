// 探测 UndertalePointerList 的可用方法
var asm = System.Reflection.Assembly.Load("UndertaleModLib");
var t = asm.GetType("UndertaleModLib.UndertalePointerList`1");
Console.WriteLine("type " + t.FullName);
foreach (var m in t.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly))
    Console.WriteLine("  " + m.ReturnType.Name + " " + m.Name + "(" + string.Join(", ", System.Array.ConvertAll(m.GetParameters(), p => p.ParameterType.Name + " " + p.Name)) + ")");
foreach (var p in t.GetProperties())
    Console.WriteLine("  prop " + p.PropertyType.Name + " " + p.Name);
foreach (var i in t.GetInterfaces()) Console.WriteLine("  iface " + i.FullName);
