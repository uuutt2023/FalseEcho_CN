param(
  [ValidateSet('move','click','key','shot','shotfull','list','rect','gclick')][string]$Cmd = 'shot',
  [string]$Out = 'E:\FalseEcho_CN\shots\game.png',
  [int]$X = 0,
  [int]$Y = 0,
  [string]$Key = '{ENTER}',
  [int]$WaitMs = 1200,
  [int]$W = 0,
  [int]$H = 0
)
$ErrorActionPreference = 'Stop'
# DPI awareness FIRST so all coordinates are physical pixels
try {
  Add-Type @"
using System; using System.Runtime.InteropServices;
public class Dpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v);
}
"@
  [void][Dpi]::SetProcessDpiAwarenessContext([IntPtr](-4))
} catch { try { [void][Dpi]::SetProcessDPIAware() } catch {} }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class GV {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, IntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool c);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$TOPMOST = [IntPtr](-1)
$NOTOPMOST = [IntPtr](-2)
$NOMOVE = 0x0002; $NOSIZE = 0x0001; $SHOWW = 0x0040

function Get-Game {
  Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}
function Focus-Game($h) {
  $fg = [GV]::GetForegroundWindow()
  $po = 0
  $t1 = [GV]::GetWindowThreadProcessId($fg, [ref]$po)
  $t2 = [GV]::GetCurrentThreadId()
  [void][GV]::AttachThreadInput($t2, $t1, $true)
  [void][GV]::ShowWindow($h, 9)
  [void][GV]::BringWindowToTop($h)
  [void][GV]::SetForegroundWindow($h)
  [void][GV]::AttachThreadInput($t2, $t1, $false)
}
function Top($h, [bool]$on) {
  $after = if ($on) { $TOPMOST } else { $NOTOPMOST }
  [void][GV]::SetWindowPos($h, $after, 0, 0, 0, 0, ($NOMOVE -bor $NOSIZE -bor $SHOWW))
}

$p = Get-Game
if (-not $p) { Write-Output "GAME NOT RUNNING"; exit 1 }
$h = $p.MainWindowHandle
$r = New-Object GV+RECT
[void][GV]::GetWindowRect($h, [ref]$r)
$gw = $r.Right - $r.Left; $gh = $r.Bottom - $r.Top

switch ($Cmd) {
  'rect' { Write-Output ("rect=({0},{1})-({2},{3}) size={4}x{5}" -f $r.Left, $r.Top, $r.Right, $r.Bottom, $gw, $gh) }
  'list' { Write-Output ("hwnd={0} rect=({1},{2}) {3}x{4}" -f $h.ToInt64(), $r.Left, $r.Top, $gw, $gh) }
  'move' {
    Top $h $true
    if ($W -le 0 -or $H -le 0) {
      [void][GV]::SetWindowPos($h, $TOPMOST, $X, $Y, 0, 0, ($NOSIZE -bor $SHOWW))
    } else {
      [void][GV]::SetWindowPos($h, $TOPMOST, $X, $Y, $W, $H, $SHOWW)
    }
    Start-Sleep -Milliseconds 600
    Top $h $false
    Start-Sleep -Milliseconds 300
    [void][GV]::GetWindowRect($h, [ref]$r)
    Write-Output ("MOVED rect=({0},{1})-({2},{3}) size={4}x{5}" -f $r.Left, $r.Top, $r.Right, $r.Bottom, ($r.Right-$r.Left), ($r.Bottom-$r.Top))
  }
  'click' {
    Focus-Game $h
    Top $h $true
    Start-Sleep -Milliseconds 600
    [void][GV]::SetCursorPos($X, $Y)
    Start-Sleep -Milliseconds 250
    [GV]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 90
    [GV]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds $WaitMs
    Top $h $false
    Write-Output ("CLICK {0},{1}" -f $X, $Y)
  }
  'key' {
    Focus-Game $h
    Top $h $true
    Start-Sleep -Milliseconds 400
    $map = @{ '{ENTER}'=0x0D; '{ESC}'=0x1B; '{TAB}'=0x09; '{SPACE}'=0x20; '{LEFT}'=0x25; '{UP}'=0x26; '{RIGHT}'=0x27; '{DOWN}'=0x28 }
    if ($map.ContainsKey($Key)) {
      $vk = [byte]$map[$Key]
      [GV]::keybd_event($vk, 0, 0, [IntPtr]::Zero)
      Start-Sleep -Milliseconds 60
      [GV]::keybd_event($vk, 0, 2, [IntPtr]::Zero)
    } else {
      $ws = New-Object -ComObject WScript.Shell
      $ws.SendKeys($Key)
    }
    Start-Sleep -Milliseconds $WaitMs
    Top $h $false
    Write-Output ("KEY {0}" -f $Key)
  }
  'gclick' {
    Focus-Game $h
    Top $h $true
    Start-Sleep -Milliseconds 600
    [void][GV]::GetWindowRect($h, [ref]$r)
    $gw = $r.Right - $r.Left; $gh = $r.Bottom - $r.Top
    $scale = $gw / 868.0
    $px = [int]($r.Left + $X * $scale)
    $py = [int]($r.Top + $Y * $scale)
    [void][GV]::SetCursorPos($px, $py)
    Start-Sleep -Milliseconds 250
    [GV]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 90
    [GV]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds $WaitMs
    Top $h $false
    Write-Output ("GCLICK logical({0},{1}) -> physical({2},{3}) scale={4}" -f $X, $Y, $px, $py, $scale)
  }
  'shot' {
    Top $h $true
    Start-Sleep -Milliseconds 700
    [void][GV]::GetWindowRect($h, [ref]$r)
    $gw = $r.Right - $r.Left; $gh = $r.Bottom - $r.Top
    $dir = Split-Path $Out -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp = New-Object System.Drawing.Bitmap($gw, $gh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
    $g.Dispose()
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Top $h $false
    Write-Output ("SAVED {0} {1}x{2} at ({3},{4})" -f $Out, $gw, $gh, $r.Left, $r.Top)
  }
  'shotfull' {
    Top $h $true
    Start-Sleep -Milliseconds 700
    $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($b.X, $b.Y, 0, 0, $bmp.Size)
    $g.Dispose()
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Top $h $false
    Write-Output ("SAVED {0} {1}x{2}" -f $Out, $b.Width, $b.Height)
  }
}
