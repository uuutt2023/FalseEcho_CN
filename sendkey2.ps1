param(
  [string]$Key = '{ENTER}',
  [int]$WaitMs = 3000,
  [string]$Out = ''
)
$ErrorActionPreference = 'Stop'
try {
  Add-Type @"
using System; using System.Runtime.InteropServices;
public class Dpi2 {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v);
}
"@
  [void][Dpi2]::SetProcessDpiAwarenessContext([IntPtr](-4))
} catch { try { [void][Dpi2]::SetProcessDPIAware() } catch {} }
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class GVD {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool c);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, IntPtr e);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
"@
$TOPMOST = [IntPtr](-1); $NOTOPMOST = [IntPtr](-2)
$NOMOVE = 0x0002; $NOSIZE = 0x0001; $SHOWW = 0x0040

$p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue |
     Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output 'GAME NOT RUNNING'; exit 1 }
$h = $p.MainWindowHandle
Write-Output ("hwnd=0x{0:X} pid={1}" -f [int64]$h, $p.Id)

$fg = [GVD]::GetForegroundWindow()
$po = 0
$t1 = [GVD]::GetWindowThreadProcessId($fg, [ref]$po)
$t2 = [GVD]::GetCurrentThreadId()
Write-Output ("before: fg=0x{0:X} (pid {1})" -f [int64]$fg, $po)
[void][GVD]::AttachThreadInput($t2, $t1, $true)
[void][GVD]::ShowWindow($h, 9)
[void][GVD]::BringWindowToTop($h)
[void][GVD]::SetForegroundWindow($h)
[void][GVD]::AttachThreadInput($t2, $t1, $false)
Start-Sleep -Milliseconds 500
$fg2 = [GVD]::GetForegroundWindow()
Write-Output ("after : fg=0x{0:X}" -f [int64]$fg2)
Write-Output ("focus ok = {0}" -f ($fg2 -eq $h))

$map = @{ '{ENTER}'=0x0D; '{ESC}'=0x1B; '{TAB}'=0x09; '{SPACE}'=0x20; '{LEFT}'=0x25; '{UP}'=0x26; '{RIGHT}'=0x27; '{DOWN}'=0x28 }
if ($map.ContainsKey($Key)) {
  $vk = [byte]$map[$Key]
  [GVD]::keybd_event($vk, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 80
  [GVD]::keybd_event($vk, 0, 2, [IntPtr]::Zero)
  Write-Output "sent vk=$vk"
} else {
  $ws = New-Object -ComObject WScript.Shell
  $ws.SendKeys($Key)
  Write-Output "sent SendKeys '$Key'"
}
Start-Sleep -Milliseconds $WaitMs
if ($Out) {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap(2560,1600)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen(0,0,0,0,$bmp.Size)
  $g.Dispose()
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "SAVED $Out"
}
