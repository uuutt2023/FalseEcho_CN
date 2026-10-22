param(
  [ValidateSet('focus','shot','click','dblclick','sclick','sdblclick','key','type','move')][string]$Action = 'focus',
  [string]$Out = 'E:\FalseEcho_CN\shots\game.png',
  [int]$X = 0,
  [int]$Y = 0,
  [string]$Text = '',
  [int]$WaitMs = 400,
  [switch]$Topmost
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class GameCtlX {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, IntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool c);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
function Get-GameWindow {
  $p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($p) { return $p }
  return $null
}
function Force-Foreground([IntPtr]$h) {
  $fg = [GameCtlX]::GetForegroundWindow()
  $tid1 = [GameCtlX]::GetWindowThreadProcessId($fg, [IntPtr]::Zero)
  $tid2 = [GameCtlX]::GetCurrentThreadId()
  [void][GameCtlX]::AttachThreadInput($tid2, $tid1, $true)
  [void][GameCtlX]::ShowWindow($h, 9)
  [void][GameCtlX]::BringWindowToTop($h)
  [void][GameCtlX]::SetForegroundWindow($h)
  [void][GameCtlX]::AttachThreadInput($tid2, $tid1, $false)
}
$HWND_TOPMOST = [IntPtr](-1)
$HWND_NOTOPMOST = [IntPtr](-2)
$SWP_NOMOVE = 0x0002; $SWP_NOSIZE = 0x0001; $SWP_SHOWWINDOW = 0x0040

$proc = Get-GameWindow
if (-not $proc) { Write-Output "GAME NOT RUNNING"; exit 1 }
$h = $proc.MainWindowHandle
$r = New-Object GameCtlX+RECT
[void][GameCtlX]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top

if ($Action -eq 'focus') {
  Force-Foreground $h
  [void][GameCtlX]::SetWindowPos($h, $HWND_TOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Start-Sleep -Milliseconds 300
  [void][GameCtlX]::SetWindowPos($h, $HWND_NOTOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Start-Sleep -Milliseconds 500
  Write-Output ("FOCUSED {0}x{1} at ({2},{3})" -f $w, $ht, $r.Left, $r.Top)
  exit 0
}
if ($Action -eq 'shot') {
  $dir = Split-Path $Out -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [void][GameCtlX]::SetWindowPos($h, $HWND_TOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Start-Sleep -Milliseconds 700
  [void][GameCtlX]::GetWindowRect($h, [ref]$r)
  $w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $g.Dispose()
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  [void][GameCtlX]::SetWindowPos($h, $HWND_NOTOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Write-Output ("SAVED {0} {1}x{2}" -f $Out, $w, $ht)
  exit 0
}
if ($Action -eq 'click' -or $Action -eq 'dblclick') {
  Force-Foreground $h
  Start-Sleep -Milliseconds 250
  $sx = $r.Left + $X; $sy = $r.Top + $Y
  [void][GameCtlX]::SetCursorPos($sx, $sy)
  Start-Sleep -Milliseconds 120
  [GameCtlX]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
  [GameCtlX]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
  if ($Action -eq 'dblclick') {
    Start-Sleep -Milliseconds 80
    [GameCtlX]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
    [GameCtlX]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
  }
  Write-Output ("CLICKED {0},{1}" -f $sx, $sy)
  Start-Sleep -Milliseconds $WaitMs
  exit 0
}
if ($Action -eq 'sclick' -or $Action -eq 'sdblclick') {
  Force-Foreground $h
  [void][GameCtlX]::SetWindowPos($h, $HWND_TOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Start-Sleep -Milliseconds 600
  [void][GameCtlX]::SetCursorPos($X, $Y)
  Start-Sleep -Milliseconds 250
  [GameCtlX]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 90
  [GameCtlX]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
  if ($Action -eq 'sdblclick') {
    Start-Sleep -Milliseconds 90
    [GameCtlX]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 90
    [GameCtlX]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
  }
  Start-Sleep -Milliseconds $WaitMs
  [void][GameCtlX]::SetWindowPos($h, $HWND_NOTOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
  Write-Output ("SCREEN-CLICKED {0},{1}" -f $X, $Y)
  exit 0
}
if ($Action -eq 'move') {
  [void][GameCtlX]::SetCursorPos($r.Left + $X, $r.Top + $Y)
  Start-Sleep -Milliseconds 200
  Write-Output "MOVED"
  exit 0
}
if ($Action -eq 'key') {
  Force-Foreground $h
  Start-Sleep -Milliseconds 200
  $ws = New-Object -ComObject WScript.Shell
  $ws.SendKeys($Text)
  Start-Sleep -Milliseconds $WaitMs
  Write-Output ("KEY {0}" -f $Text)
  exit 0
}
if ($Action -eq 'type') {
  Force-Foreground $h
  Start-Sleep -Milliseconds 200
  $ws = New-Object -ComObject WScript.Shell
  $ws.SendKeys($Text)
  Start-Sleep -Milliseconds $WaitMs
  Write-Output ("TYPED {0}" -f $Text)
  exit 0
}
