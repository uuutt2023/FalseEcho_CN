param(
  [Parameter(ValueFromRemainingArguments=$true)][string[]]$Cmd
)
$ErrorActionPreference = 'Stop'
$base = 'E:\FalseEcho_CN\drv'
$qdir = Join-Path $base 'q'
$ddir = Join-Path $base 'done'
$odir = Join-Path $base 'out'
foreach ($d in @($qdir, $ddir, $odir)) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null } }

$next = 0
Get-ChildItem $qdir -Filter '*.txt' -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.BaseName -match '^\d+$') { $v = [int]$_.BaseName; if ($v -ge $next) { $next = $v + 1 } }
}
$id = '{0:D4}' -f $next
$qf = Join-Path $qdir ($id + '.txt')
Set-Content -Path $qf -Value ($Cmd -join "`n") -Encoding ASCII
$df = Join-Path $ddir ($id + '.txt')
$t0 = Get-Date
while (-not (Test-Path $df)) {
  if (((Get-Date) - $t0).TotalSeconds -gt 120) { Write-Output "TIMEOUT waiting for $id"; exit 2 }
  Start-Sleep -Milliseconds 200
}
Start-Sleep -Milliseconds 200
Write-Output ("--- $id ---")
Get-Content $df | ForEach-Object { Write-Output $_ }
