$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class Tok {
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool OpenProcessToken(IntPtr h, uint a, out IntPtr t);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool GetTokenInformation(IntPtr t, int c, IntPtr b, int l, out int r);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
"@
function Get-IL([int]$procId) {
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    $h = $p.Handle
    $tok = [IntPtr]::Zero
    if (-not [Tok]::OpenProcessToken($h, 8, [ref]$tok)) { return "openfail" }
    $len = 0
    [void][Tok]::GetTokenInformation($tok, 25, [IntPtr]::Zero, 0, [ref]$len)
    $buf = [Runtime.InteropServices.Marshal]::AllocHGlobal($len)
    [void][Tok]::GetTokenInformation($tok, 25, $buf, $len, [ref]$len)
    $sid = [Runtime.InteropServices.Marshal]::PtrToStructure($buf, [type]'System.Security.Principal.SecurityIdentifier'])
    $v = $sid.Value
    [Runtime.InteropServices.Marshal]::FreeHGlobal($buf)
    [void][Tok]::CloseHandle($tok)
    return $v
  } catch { return "err" }
}
$map = @{ 'S-1-16-8192'='Medium'; 'S-1-16-12288'='High'; 'S-1-16-16384'='System'; 'S-1-16-16384'='System' }
function Name($s) { if ($map.ContainsKey($s)) { return $map[$s] } return $s }
Write-Output ("SHELL  pid={0} il={1} ({2})" -f $PID, (Get-IL $PID), (Name (Get-IL $PID)))
Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue | ForEach-Object {
  $il = Get-IL $_.Id
  Write-Output ("GAME   pid={0} il={1} ({2})" -f $_.Id, $il, (Name $il))
}
Get-CimInstance Win32_Process | Where-Object { $_.Name -match '(?i)cua|driver|agent' } | ForEach-Object {
  $il = Get-IL $_.ProcessId
  Write-Output ("OTHER  {0} pid={1} il={2} ({3})" -f $_.Name, $_.ProcessId, $il, (Name $il))
}
