$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class P {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool CloseHandle(IntPtr h);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool OpenProcessToken(IntPtr h, uint acc, out IntPtr tok);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool GetTokenInformation(IntPtr tok, int cls, IntPtr buf, int len, out int ret);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern IntPtr ConvertSidToStringSid(IntPtr sid, out IntPtr str);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr LocalFree(IntPtr p);
}
"@
function Show-Proc($name) {
  Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
    $id2 = $_.Id
    $h = [P]::OpenProcess(0x1000, $false, $id2)   # PROCESS_QUERY_LIMITED_INFORMATION
    $il = 'n/a'
    if ($h -ne [IntPtr]::Zero) {
      $tok = [IntPtr]::Zero
      if ([P]::OpenProcessToken($h, 0x0008, [ref]$tok)) {
        $len = 0
        [void][P]::GetTokenInformation($tok, 25, [IntPtr]::Zero, 0, [ref]$len)
        $buf = [Runtime.InteropServices.Marshal]::AllocHGlobal($len)
        [void][P]::GetTokenInformation($tok, 25, $buf, $len, [ref]$len)
        # TOKEN_MANDATORY_LABEL = { PSID Label; DWORD Attributes; } -> deref first ptr
        $sidPtr = [Runtime.InteropServices.Marshal]::ReadIntPtr($buf, 0)
        $sp = [IntPtr]::Zero
        if ($sidPtr -ne [IntPtr]::Zero -and [P]::ConvertSidToStringSid($sidPtr, [ref]$sp)) {
          $il = [Runtime.InteropServices.Marshal]::PtrToStringAnsi($sp)
          [void][P]::LocalFree($sp)
        }
        [Runtime.InteropServices.Marshal]::FreeHGlobal($buf)
        [void][P]::CloseHandle($tok)
      }
      [void][P]::CloseHandle($h)
    }
    $term = [P]::OpenProcess(0x0001, $false, $id2)  # PROCESS_TERMINATE
    $canTerm = ($term -ne [IntPtr]::Zero)
    if ($term -ne [IntPtr]::Zero) { [void][P]::CloseHandle($term) }
    $lvl = switch -Regex ($il) {
      'S-1-16-8192'  { 'Medium' }
      'S-1-16-12288' { 'High' }
      'S-1-16-16384' { 'System' }
      default        { $il }
    }
    Write-Output ("{0,-18} pid={1,-6} il={2,-8} canTerminate={3}" -f $_.ProcessName, $id2, $lvl, $canTerm)
  }
}
Write-Output ("{0,-18} pid={1,-6} (this shell)" -f 'SHELL', $PID)
Show-Proc 'False Echo'
Show-Proc 'steam'
Show-Proc 'MiniMax Code'
Show-Proc 'gameoverlayui64'
Show-Proc 'explorer'
