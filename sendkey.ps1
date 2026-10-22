param([string]$Key = '{ENTER}', [int]$WaitMs = 1200)
$ErrorActionPreference = 'Stop'
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class KB {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint f, IntPtr e);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool c);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
"@
function FGTitle() {
  $sb = New-Object System.Text.StringBuilder 256
  [void][KB]::GetWindowText([KB]::GetForegroundWindow(), $sb, 256)
  return $sb.ToString()
}
$p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output "GAME NOT RUNNING"; exit 1 }
$h = $p.MainWindowHandle
Write-Output ("before focus: '" + (FGTitle) + "'")
$fg = [KB]::GetForegroundWindow()
$pidOut = 0; $t1 = [KB]::GetWindowThreadProcessId($fg, [ref]$pidOut)
$t2 = [KB]::GetCurrentThreadId()
[void][KB]::AttachThreadInput($t2, $t1, $true)
[void][KB]::ShowWindow($h, 9)
[void][KB]::BringWindowToTop($h)
[void][KB]::SetForegroundWindow($h)
[void][KB]::AttachThreadInput($t2, $t1, $false)
Start-Sleep -Milliseconds 600
Write-Output ("after focus : '" + (FGTitle) + "'")

# map key name -> virtual key code
$map = @{
  '{ENTER}' = 0x0D; '{ESC}' = 0x1B; '{TAB}' = 0x09; '{SPACE}' = 0x20
  '{LEFT}' = 0x25; '{UP}' = 0x26; '{RIGHT}' = 0x27; '{DOWN}' = 0x28
  '{F1}' = 0x70; '{F2}' = 0x71; '{F3}' = 0x72; '{F4}' = 0x73; '{F5}' = 0x74; '{F6}' = 0x75
}
if ($map.ContainsKey($Key)) {
  $vk = $map[$Key]
  [KB]::keybd_event([byte]$vk, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [KB]::keybd_event([byte]$vk, 0, 2, [IntPtr]::Zero)
  Write-Output ("SENT {0} (vk=0x{1:X})" -f $Key, $vk)
} else {
  # printable single char
  $ch = $Key.ToCharArray()[0]
  $vk = [byte][char]::ToUpperInvariant($ch)
  [KB]::keybd_event($vk, 0, 0, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [KB]::keybd_event($vk, 0, 2, [IntPtr]::Zero)
  Write-Output ("SENT char '{0}' (vk=0x{1:X})" -f $ch, $vk)
}
Start-Sleep -Milliseconds $WaitMs
Write-Output ("fg now: '" + (FGTitle) + "'")
