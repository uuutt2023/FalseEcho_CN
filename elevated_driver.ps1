$ErrorActionPreference = 'Stop'
$base = 'E:\FalseEcho_CN\drv'
$qdir = Join-Path $base 'q'
$ddir = Join-Path $base 'done'
$odir = Join-Path $base 'out'
foreach ($d in @($qdir, $ddir, $odir)) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null } }
if (Test-Path (Join-Path $base 'stop')) { Remove-Item (Join-Path $base 'stop') -Force -ErrorAction SilentlyContinue }

try {
  Add-Type @"
using System; using System.Runtime.InteropServices;
public class DpiE { [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v); }
"@
  [void][DpiE]::SetProcessDpiAwarenessContext([IntPtr](-4))
} catch { }
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class ED {
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
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$TOPMOST = [IntPtr](-1); $NOTOPMOST = [IntPtr](-2)
$NOMOVEF = 0x0002; $NOSIZEF = 0x0001; $SHOWWF = 0x0040

function Get-GameHwnd {
  $p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue |
       Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($p) { return $p.MainWindowHandle }
  return [IntPtr]::Zero
}
function Get-Rect([IntPtr]$h) { $r = New-Object ED+RECT; [void][ED]::GetWindowRect($h, [ref]$r); return $r }
function FgTitle { $f = [ED]::GetForegroundWindow(); $sb = New-Object Text.StringBuilder 256; [void][ED]::GetWindowText($f, $sb, 256); return "0x$([int64]$f) '$($sb.ToString())'" }
function Focus-Game([IntPtr]$h) {
  $fg = [ED]::GetForegroundWindow(); $po = [IntPtr]::Zero
  $t1 = [ED]::GetWindowThreadProcessId($fg, $po); $t2 = [ED]::GetCurrentThreadId()
  [void][ED]::AttachThreadInput($t2, $t1, $true)
  [void][ED]::ShowWindow($h, 9)
  [void][ED]::BringWindowToTop($h)
  [void][ED]::SetForegroundWindow($h)
  [void][ED]::AttachThreadInput($t2, $t1, $false)
  Start-Sleep -Milliseconds 350
}
function Send-Key([string]$k) {
  $map = @{ 'ENTER'=0x0D; 'ESC'=0x1B; 'TAB'=0x09; 'SPACE'=0x20; 'LEFT'=0x25; 'UP'=0x26; 'RIGHT'=0x27; 'DOWN'=0x28; 'F1'=0x70; 'F11'=0x7A }
  if ($map.ContainsKey($k)) {
    $vk = [byte]$map[$k]
    [ED]::keybd_event($vk, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 120
    [ED]::keybd_event($vk, 0, 2, [IntPtr]::Zero)
  } else {
    $ws = New-Object -ComObject WScript.Shell
    $ws.SendKeys($k)
  }
}
function Save-Shot([IntPtr]$h, [string]$name) {
  $r = Get-Rect $h
  $w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
  if ($w -le 0 -or $ht -le 0) { return "bad rect $w x $ht" }
  $bmp = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $g.Dispose()
  $p = Join-Path $odir ($name + '.png')
  $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return $p
}

Set-Content -Path (Join-Path $base 'ready') -Value "ready $(Get-Date -Format o)"
while ($true) {
  if (Test-Path (Join-Path $base 'stop')) { break }
  $n = 0
  $found = $null
  Get-ChildItem $qdir -Filter '*.txt' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.BaseName -match '^\d+$') {
      $v = [int]$_.BaseName
      if ($v -ge $n -and -not (Test-Path (Join-Path $ddir ($_.BaseName + '.txt')))) { $n = $v; $found = $_ }
    }
  }
  if ($found) {
    $lines = Get-Content $found.FullName -ErrorAction SilentlyContinue
    $log = New-Object System.Collections.Generic.List[string]
    $h = Get-GameHwnd
    if ($h -eq [IntPtr]::Zero) {
      $log.Add('GAME NOT RUNNING')
    } else {
      foreach ($line in $lines) {
        if (-not $line) { continue }
        $cmd = $line.Trim()
        $verb = ($cmd -split ':')[0].ToLower()
        $arg = if ($cmd -match ':(.*)$') { $Matches[1] } else { '' }
        try {
          switch ($verb) {
            'focus' { Focus-Game $h; $log.Add('focus: ' + (FgTitle)) }
            'key'   { Focus-Game $h; Send-Key $arg; $log.Add("key $arg") }
            'keyonly' { Send-Key $arg; $log.Add("keyonly $arg") }
            'click' {
              $p = $arg -split ','
              Focus-Game $h
              [void][ED]::SetCursorPos([int]$p[0], [int]$p[1]); Start-Sleep -Milliseconds 220
              [ED]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero); Start-Sleep -Milliseconds 80
              [ED]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)
              $log.Add("click $arg")
            }
            'gclick' {
              $p = $arg -split ','
              Focus-Game $h
              $r = Get-Rect $h
              $scale = ($r.Right - $r.Left) / 868.0
              $px = [int]($r.Left + [double]$p[0] * $scale)
              $py = [int]($r.Top + [double]$p[1] * $scale)
              [void][ED]::SetCursorPos($px, $py); Start-Sleep -Milliseconds 220
              [ED]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero); Start-Sleep -Milliseconds 80
              [ED]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)
              $log.Add("gclick $arg -> $px,$py scale=$scale")
            }
            'gdrag' {
              $p = $arg -split ','
              Focus-Game $h
              $r = Get-Rect $h
              $scale = ($r.Right - $r.Left) / 868.0
              $sx = [int]($r.Left + [double]$p[0] * $scale)
              $sy = [int]($r.Top  + [double]$p[1] * $scale)
              $ex = [int]($r.Left + [double]$p[2] * $scale)
              $ey = [int]($r.Top  + [double]$p[3] * $scale)
              $steps = 24
              [void][ED]::SetCursorPos($sx, $sy); Start-Sleep -Milliseconds 260
              [ED]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero); Start-Sleep -Milliseconds 140
              for ($i = 1; $i -le $steps; $i++) {
                $t = $i / [double]$steps
                $mx = [int]($sx + ($ex - $sx) * $t)
                $my = [int]($sy + ($ey - $sy) * $t)
                [void][ED]::SetCursorPos($mx, $my)
                Start-Sleep -Milliseconds 28
              }
              Start-Sleep -Milliseconds 140
              [ED]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)
              $log.Add("gdrag $arg -> $sx,$sy => $ex,$ey scale=$scale")
            }
            'move' {
              $p = $arg -split ','
              [void][ED]::SetCursorPos([int]$p[0], [int]$p[1]); $log.Add("move $arg")
            }
            'shot' { $log.Add('shot: ' + (Save-Shot $h $arg)) }
            'rect' { $r = Get-Rect $h; $log.Add("rect=($($r.Left),$($r.Top))-($($r.Right),$($r.Bottom)) fg=$(FgTitle)") }
            'sleep' { Start-Sleep -Milliseconds ([int]$arg); $log.Add("sleep $arg") }
            'stop'  { $log.Add('stop') }
            default  { $log.Add("unknown: $cmd") }
          }
        } catch { $log.Add("ERR $cmd : $($_.Exception.Message)") }
        Start-Sleep -Milliseconds 200
      }
      if ($lines -match '^stop\s*$') {
        Set-Content -Path (Join-Path $ddir ($found.BaseName + '.txt')) -Value ($log -join "`n")
        break
      }
    }
    Set-Content -Path (Join-Path $ddir ($found.BaseName + '.txt')) -Value ($log -join "`n")
    continue
  }
  Start-Sleep -Milliseconds 250
}
Set-Content -Path (Join-Path $base 'ready') -Value "stopped $(Get-Date -Format o)"
