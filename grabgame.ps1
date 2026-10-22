param(
  [string]$Out = 'E:\FalseEcho_CN\shots\game.png',
  [int]$WaitSec = 25
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class GW {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Start-Sleep -Seconds $WaitSec
$proc = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { Write-Output "GAME NOT RUNNING"; exit 1 }
$h = $proc.MainWindowHandle
[void][GW]::ShowWindow($h, 9)
[void][GW]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 1500
$r = New-Object GW+RECT
[void][GW]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
if ($w -lt 200 -or $ht -lt 200) {
  Write-Output ("window too small {0}x{1}" -f $w, $ht); exit 1
}
$dir = Split-Path $Out -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$bmp = New-Object System.Drawing.Bitmap($w, $ht)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ("SAVED {0}  {1}x{2}" -f $Out, $w, $ht)
