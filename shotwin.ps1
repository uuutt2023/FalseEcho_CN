param(
  [string]$TitleMatch = '',
  [string]$Out = 'E:\FalseEcho_CN\shots\shot.png',
  [int]$DelayMs = 0
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool repaint);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }

$hwnd = [IntPtr]::Zero
if ($TitleMatch -ne '') {
  $p = Get-Process | Where-Object { $_.MainWindowTitle -like "*$TitleMatch*" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($p) { $hwnd = $p.MainWindowHandle; [void][W]::ShowWindow($hwnd, 9); [void][W]::SetForegroundWindow($hwnd); Start-Sleep -Milliseconds 600 }
}
$fg = [W]::GetForegroundWindow()
$r = New-Object W+RECT
[void][W]::GetWindowRect($fg, [ref]$r)
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top

$dir = Split-Path $Out -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
if ($w -le 0 -or $h -le 0) {
  $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($b.X, $b.Y, 0, 0, $bmp.Size)
} else {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
}
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ("SAVED " + $Out + "  window=" + $w + "x" + $h + " at (" + $r.Left + "," + $r.Top + ")")
