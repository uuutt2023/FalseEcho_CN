param(
  [string]$Key = '',
  [int]$WaitMs = 2000,
  [string]$Out = 'E:\FalseEcho_CN\shots\ctrl.png',
  [int]$ClickX = -1,
  [int]$ClickY = -1,
  [int]$MoveX = 1200,
  [int]$MoveY = 700,
  [switch]$NoMove
)
$ErrorActionPreference = 'Stop'
try {
  Add-Type @"
using System; using System.Runtime.InteropServices;
public class D3 {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v);
}
"@
  [void][D3]::SetProcessDpiAwarenessContext([IntPtr](-4))
} catch { }
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class C3 {
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
  [DllImport("user32.dll")] public static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$TOPMOST = [IntPtr](-1)
$NOMOVE = 0x0002; $NOSIZE = 0x0001; $SHOWW = 0x0040

$proc = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Output 'GAME NOT RUNNING'; exit 1 }
$h = $proc.MainWindowHandle

function Get-Rect { $r = New-Object C3+RECT; [void][C3]::GetWindowRect($h, [ref]$r); return $r }
function FgTitle { $f = [C3]::GetForegroundWindow(); $sb = New-Object Text.StringBuilder 256; [void][C3]::GetWindowText($f, $sb, 256); return "0x$([int64]$f) '$($sb.ToString())'" }

# 1. reposition (unless told not to) so nothing overlaps it
if (-not $NoMove) {
  [void][C3]::ShowWindow($h, 9)
  [void][C3]::SetWindowPos($h, $TOPMOST, $MoveX, $MoveY, 0, 0, ($NOSIZE -bor $SHOWW))
  Start-Sleep -Milliseconds 700
}
# 2. keep it topmost the whole time
[void][C3]::SetWindowPos($h, $TOPMOST, 0, 0, 0, 0, ($NOMOVE -bor $NOSIZE -bor $SHOWW))
Start-Sleep -Milliseconds 300

# 3. focus
$fg = [C3]::GetForegroundWindow()
$po = [IntPtr]::Zero
$t1 = [C3]::GetWindowThreadProcessId($fg, $po)
$t2 = [C3]::GetCurrentThreadId()
[void][C3]::AttachThreadInput($t2, $t1, $true)
[void][C3]::BringWindowToTop($h)
[void][C3]::SetForegroundWindow($h)
[void][C3]::AttachThreadInput($t2, $t1, $false)
Start-Sleep -Milliseconds 500
Write-Output ("fg after focus: " + (FgTitle))
Write-Output ("game hwnd     : 0x{0:X}" -f [int64]$h)

$r = Get-Rect
Write-Output ("rect=({0},{1})-({2},{3})" -f $r.Left, $r.Top, $r.Right, $r.Bottom)

# 4. act
if ($Key -ne '') {
  $map = @{ '{ENTER}'=0x0D; '{ESC}'=0x1B; '{TAB}'=0x09; '{SPACE}'=0x20; '{LEFT}'=0x25; '{UP}'=0x26; '{RIGHT}'=0x27; '{DOWN}'=0x28 }
  if ($map.ContainsKey($Key)) {
    $vk = [byte]$map[$Key]
    [C3]::keybd_event($vk, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 120
    [C3]::keybd_event($vk, 0, 2, [IntPtr]::Zero)
  } else {
    $ws = New-Object -ComObject WScript.Shell
    $ws.SendKeys($Key)
  }
  Write-Output "sent key '$Key'"
}
if ($ClickX -ge 0) {
  $px = $r.Left + $ClickX
  $py = $r.Top + $ClickY
  [void][C3]::SetCursorPos($px, $py)
  Start-Sleep -Milliseconds 300
  [C3]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 90
  [C3]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
  Write-Output "clicked $px,$py"
}

Start-Sleep -Milliseconds $WaitMs
Write-Output ("fg after act : " + (FgTitle))

# 5. capture
$r = Get-Rect
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
if ($w -le 0 -or $ht -le 0) { Write-Output 'BAD RECT'; exit 1 }
$bmp = New-Object System.Drawing.Bitmap($w, $ht)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ("SAVED {0} {1}x{2}" -f $Out, $w, $ht)
