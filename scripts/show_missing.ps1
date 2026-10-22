param(
  [string]$Path = "E:\FalseEcho_CN\loc\Localization - EN.tsv",
  [int]$Skip = 0,
  [int]$Count = 150
)
$ErrorActionPreference='Stop'
$done=@{}
Get-ChildItem "E:\FalseEcho_CN\trans\Localization.cn.*.tsv" -ErrorAction SilentlyContinue | ForEach-Object {
  foreach($l in [System.IO.File]::ReadAllLines($_.FullName,[System.Text.Encoding]::UTF8)){
    if($l.Trim()){ $done[(($l -split "`t",2)[0])] = 1 }
  }
}
$src=[System.IO.File]::ReadAllLines($Path,[System.Text.Encoding]::UTF8)
$miss=@()
foreach($l in $src){
  $k=($l -split "`t",2)[0]
  if(-not $done.ContainsKey($k)){ $miss += $l }
}
"UNTRANSLATED: $($miss.Count)   DONE: $($done.Count)"
$sel = $miss | Select-Object -Skip $Skip -First $Count
foreach($l in $sel){
  $p=$l -split "`t",2
  $t=$p[1] -replace '(\\r\\n)+','<BR>' -replace '\\n','[NL]' -replace '\\r',''
  "[$($p[0])] $t"
}
