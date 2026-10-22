param([int]$X = 0, [int]$Y = 0, [int]$W = 1360, [int]$H = 800)
$ErrorActionPreference = 'Stop'
Add-Type @"
using System; using System.Runtime.InteropServices;
public class MoveW {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output "GAME NOT RUNNING"; exit 1 }
$h = $p.MainWindowHandle
[void][MoveW]::SetWindowPos($h, [IntPtr](-1), $X, $Y, $W, $H, 0x0040)
Start-Sleep -Milliseconds 400
[void][MoveW]::SetWindowPos($h, [IntPtr](-2), $X, $Y, $W, $H, 0x0040)
Start-Sleep -Milliseconds 400
$r = New-Object MoveW+RECT
[void][MoveW]::GetWindowRect($h, [ref]$r)
Write-Output ("MOVED to ({0},{1}) {2}x{3}" -f $r.Left, $r.Top, ($r.Right-$r.Left), ($r.Bottom-$r.Top))
