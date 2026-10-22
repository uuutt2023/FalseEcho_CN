$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('E:\FalseEcho_CN\pages\page_00.png')
$hist = @{}
for ($y = 0; $y -lt $img.Height; $y += 1) {
  for ($x = 0; $x -lt $img.Width; $x += 1) {
    $a = $img.GetPixel($x, $y).A
    if ($a -eq 0) { continue }
    $k = [string]$a
    if ($hist.ContainsKey($k)) { $hist[$k] = $hist[$k] + 1 } else { $hist[$k] = 1 }
  }
}
$img.Dispose()
Write-Host "distinct alpha values (non-zero): $($hist.Count)"
$hist.GetEnumerator() | Sort-Object { [int]$_.Key } | Select-Object -First 40 | ForEach-Object { Write-Host ("  A={0,3}  count={1}" -f $_.Key, $_.Value) }
