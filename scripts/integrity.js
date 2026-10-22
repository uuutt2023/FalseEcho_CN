// Report the integrity level (and elevation) of the current process, the game,
// and the CUA driver, so we can explain why injected input is dropped.
const { execSync } = require('child_process');

const ps = `
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class Tok {
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool OpenProcessToken(IntPtr h, uint a, out IntPtr t);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool GetTokenInformation(IntPtr t, int c, IntPtr b, int l, out int r);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [DllImport("advapi32.dll")] public static extern IntPtr GetCurrentProcess();
}
"@
function Get-IL([int]$pid_) {
  try {
    $p = Get-Process -Id $pid_ -ErrorAction Stop
    $h = $p.Handle
    $tok = [IntPtr]::Zero
    if (-not [Tok]::OpenProcessToken($h, 8, [ref]$tok)) { return "OpenToken failed" }   # TOKEN_QUERY
    $len = 0
    [void][Tok]::GetTokenInformation($tok, 25, [IntPtr]::Zero, 0, [ref]$len)             # TokenIntegrityLevel
    $buf = [Runtime.InteropServices.Marshal]::AllocHGlobal($len)
    [void][Tok]::GetTokenInformation($tok, 25, $buf, $len, [ref]$len)
    $sid = [Runtime.InteropServices.Marshal]::PtrToStructure($buf, [type]'System.Security.Principal.SecurityIdentifier')
    $s = $sid.Value
    [Runtime.InteropServices.Marshal]::FreeHGlobal($buf)
    [void][Tok]::CloseHandle($tok)
    return $s
  } catch { return "err: " + $_.Exception.Message }
}
Write-Output ("CURRENT_SHELL_PID=" + $PID)
Write-Output ("CURRENT_SHELL_IL=" + (Get-IL $PID))
foreach ($n in @('False Echo','cua-driver','Minimax','node','powershell')) {
  Get-Process -Name $n -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Output ("PROC {0} pid={1} il={2}" -f $_.ProcessName, $_.Id, (Get-IL $_.Id))
  }
}
`;
try {
  console.log(execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "' + ps.replace(/"/g, '\\"') + '"', { encoding: 'utf8' }));
} catch (e) {
  console.log('ERR', e.message);
  console.log(e.stdout ? e.stdout.toString() : '');
}
