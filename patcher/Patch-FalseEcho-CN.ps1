<#
    False Echo - Simplified Chinese localization patcher
    ---------------------------------------------------------------
    Drop this whole folder into the game root (the folder that holds
    "False Echo.exe" and "data.win") and run  Install-CN.cmd

    Actions:
      install   (default) patch the game with the Chinese localization
      restore             put the original files back
      verify              report whether the game is patched

    The script is ASCII-only on purpose: Windows PowerShell 5.1 parses
    .ps1 files without a BOM as ANSI, so any non-ASCII literal would be
    mangled.  Chinese console messages are embedded as base64 and decoded
    at run time.
#>
param(
    [ValidateSet('install', 'restore', 'verify')]
    [string]$Action = 'install',
    [string]$GameDir = '',
    [string]$BackupDir = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# ---------------------------------------------------------------- messages
$MSGB64 = @{
    M_FIND     = '5bey5om+5Yiw5ri45oiP55uu5b2V77yaezB9'
    M_NOFIND   = '6ZSZ6K+v77ya5pyq5om+5YiwIEZhbHNlIEVjaG8uZXhlIOS4jiBkYXRhLndpbuOAguivt+aKiuacrOW3peWFt+aVtOS4quaWh+S7tuWkueaUvui/m+a4uOaIj+agueebruW9leWQjuWGjei/kOihjOOAgg=='
    M_RUNNING  = '6ZSZ6K+v77ya5ri45oiP5q2j5Zyo6L+Q6KGM77yM6K+35YWI5a6M5YWo6YCA5Ye65ri45oiP5YaN5a6J6KOF6KGl5LiB44CC'
    M_BACKUP   = '5q2j5Zyo5aSH5Lu95Y6f54mI5paH5Lu25YiwIOWOn+eJiOWkh+S7vSDmlofku7blpLnigKbigKY='
    M_EXE      = '5q2j5Zyo5L+u6KGlIEZhbHNlIEVjaG8uZXhl77yI5rGJ5YyW5paH5pysICsg5a2X56ym5Liy5rGg77yJ4oCm4oCm'
    M_DW       = '5q2j5Zyo6YeN5bu6IGRhdGEud2lu77yI5rGJ5YyW5paH5pys5Z2XICsg5Lit5paH5a2X5L2T5Zu+6ZuG77yJ4oCm4oCm'
    M_DONE     = '566A5L2T5Lit5paH6KGl5LiB5a6J6KOF5a6M5oiQ77yB'
    M_RESTORE  = '5bey5oGi5aSN5Y6f54mI5paH5Lu277yM6KGl5LiB5bey5Y246L2944CC'
    M_HASHWARN = '6K2m5ZGK77ya5paH5Lu25qCh6aqM5LiO6KGl5LiB6aKE5pyf5LiN5LiA6Ie077yI5ri45oiP54mI5pys5Y+v6IO95LiN5ZCM77yJ77yM5LuN57un57ut5a6J6KOF44CC'
    M_ALREADY  = '5qOA5rWL5Yiw6KGl5LiB5bey5a6J6KOF77yM5peg6ZyA6YeN5aSN5a6J6KOF44CC'
    M_OK       = '5qCh6aqM6YCa6L+H44CC'
}
function Z([string]$b64) { [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) }
function Say([string]$key, [string[]]$fmtArgs) {
    $m = Z $MSGB64[$key]
    if ($fmtArgs -and $fmtArgs.Count -gt 0) { $m = $m -f $fmtArgs }
    Write-Host $m
}

# ---------------------------------------------------------------- paths
$here      = Split-Path -Parent $MyInvocation.MyCommand.Path
$payload   = Join-Path $here 'payload'
$utmt      = Join-Path $here 'tools\utmt\UndertaleModCli.exe'
$backupDir = if ($BackupDir) { $BackupDir } else { Join-Path $here 'backup_original' }

function Find-GameDir {
    $cands = New-Object System.Collections.ArrayList
    [void]$cands.Add($here)
    [void]$cands.Add((Split-Path -Parent $here))
    [void]$cands.Add((Join-Path $here 'False Echo Demo'))
    [void]$cands.Add((Join-Path (Split-Path -Parent $here) 'False Echo Demo'))
    foreach ($c in $cands) {
        if ((Test-Path (Join-Path $c 'False Echo.exe')) -and (Test-Path (Join-Path $c 'data.win'))) { return (Resolve-Path $c).Path }
    }
    return $null
}

$game = Find-GameDir
if ($GameDir) {
    if ((Test-Path (Join-Path $GameDir 'False Echo.exe')) -and (Test-Path (Join-Path $GameDir 'data.win'))) {
        $game = (Resolve-Path $GameDir).Path
    } else { $game = $null }
}
if (-not $game) { Say 'M_NOFIND'; Write-Host 'Game directory not found.'; exit 2 }
Say 'M_FIND' @($game)

$exePath = Join-Path $game 'False Echo.exe'
$winPath = Join-Path $game 'data.win'

# ---------------------------------------------------------------- helpers
function Get-U32($b, [int]$o) { return [BitConverter]::ToUInt32($b, $o) }
function Get-U16($b, [int]$o) { return [BitConverter]::ToUInt16($b, $o) }
function Set-U32($b, [int]$o, [uint32]$v) { [BitConverter]::GetBytes($v).CopyTo($b, $o) }
function Set-U16($b, [int]$o, [uint16]$v) { [BitConverter]::GetBytes($v).CopyTo($b, $o) }
function Get-Sha256([string]$p) {
    $h = [System.Security.Cryptography.SHA256]::Create()
    $fs = [System.IO.File]::OpenRead($p)
    try { return ([BitConverter]::ToString($h.ComputeHash($fs))).Replace('-', '') } finally { $fs.Dispose(); $h.Dispose() }
}

# ---------------------------------------------------------------- exe patch
function Patch-Exe([string]$src, [string]$dst) {
    Write-Host '  reading exe ...'
    $buf   = [System.IO.File]::ReadAllBytes($src)
    $plan  = Get-Content (Join-Path $payload 'exe_plan.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $b64m  = Get-Content (Join-Path $payload 'blobs_b64.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $lits  = Get-Content (Join-Path $payload 'exe_literals.json') -Raw -Encoding UTF8 | ConvertFrom-Json

    $peOff = [int]$plan.pe.peOff
    $secOff = [int]$plan.pe.secOff
    $optHdr = [int]$plan.pe.optHdr
    $numSections = [int]$plan.pe.numSections
    $sectionAlignment = [int]$plan.pe.sectionAlignment
    $fileAlignment = [int]$plan.pe.fileAlignment

    $secs = @()
    for ($i = 0; $i -lt $numSections; $i++) {
        $o = $secOff + $i * 40
        $secs += [pscustomobject]@{
            name   = ([System.Text.Encoding]::ASCII.GetString($buf, $o, 8)).TrimEnd([char]0)
            vsize  = [int64](Get-U32 $buf ($o + 8))
            vaddr  = [int64](Get-U32 $buf ($o + 12))
            rawsize= [int64](Get-U32 $buf ($o + 16))
            rawptr = [int64](Get-U32 $buf ($o + 20))
        }
    }
    function To-Rva([int64]$fo) {
        foreach ($s in $secs) {
            if ($fo -ge $s.rawptr -and $fo -lt ($s.rawptr + $s.rawsize)) { return [int64]($s.vaddr + ($fo - $s.rawptr)) }
        }
        return [int64](-1)
    }

    $newSec  = $plan.pe.newSec
    $secBuf  = New-Object byte[] ([int]$newSec.vsize)

    $relocs = @{}   # label -> @{ newRva = ... }

    # --- baked text blocks (base64 payloads inside the exe string pool)
    $n = 0
    foreach ($b in $plan.blobs) {
        $n++
        if ($n % 20 -eq 0) { Write-Host ("    blobs {0}/{1}" -f $n, $plan.blobs.Count) }
        $b64 = [string]$b64m.([string]$b.idx)
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($b64)
        $off = [int]$b.off
        if ($b.action -eq 'inplace') {
            $bytes.CopyTo($buf, $off)
            $buf[$off + $bytes.Length] = 0
            for ($k = $off + $bytes.Length + 1; $k -lt ($off + $b.slotLen); $k++) { $buf[$k] = 0 }
        } else {
            $bytes.CopyTo($secBuf, [int]$b.secOffIn)
            $secBuf[[int]$b.secOffIn + $bytes.Length] = 0
            [Array]::Clear($buf, $off, [int]$b.slotLen)
            $relocs['blob' + $b.idx] = [int64]$newSec.vaddr + [int64]$b.secOffIn
        }
    }

    # --- plain literals
    $litByOff = @{}
    foreach ($l in $lits) { $litByOff[[int64]$l.off] = $l }
    $n = 0
    foreach ($p in $plan.literals) {
        $n++
        if ($n % 50 -eq 0) { Write-Host ("    literals {0}/{1}" -f $n, $plan.literals.Count) }
        $off = [int]$p.off
        $lit = $litByOff[[int64]$p.off]
        $bytes = [System.Text.Encoding]::UTF8.GetBytes([string]$lit.text)
        if ($p.action -eq 'inplace') {
            $bytes.CopyTo($buf, $off)
            $buf[$off + $bytes.Length] = 0
            for ($k = $off + $bytes.Length + 1; $k -lt ($off + $p.origLen); $k++) { $buf[$k] = 0 }
        } else {
            $bytes.CopyTo($secBuf, [int]$p.secOffIn)
            $secBuf[[int]$p.secOffIn + $bytes.Length] = 0
            [Array]::Clear($buf, $off, [int]$p.origLen + 1)
            $relocs['lit@0x' + $off.ToString('x')] = [int64]$newSec.vaddr + [int64]$p.secOffIn
        }
    }

    # --- append the new section and fix the PE headers
    $rawSize = [int]$newSec.rawsize
    $payload2 = New-Object byte[] $rawSize
    $secBuf.CopyTo($payload2, 0)
    $final = New-Object byte[] ($buf.Length + $rawSize)
    $buf.CopyTo($final, 0)
    $payload2.CopyTo($final, $buf.Length)

    $h = [int]$newSec.hdrOff
    $name = [System.Text.Encoding]::ASCII.GetBytes('.cndata')
    for ($i = 0; $i -lt 8; $i++) { $final[$h + $i] = 0 }
    [Array]::Copy($name, 0, $final, $h, $name.Length)
    Set-U32 $final ($h + 8)  ([uint32]$newSec.vsize)
    Set-U32 $final ($h + 12) ([uint32]$newSec.vaddr)
    Set-U32 $final ($h + 16) ([uint32]$rawSize)
    Set-U32 $final ($h + 20) ([uint32]$newSec.rawptr)
    Set-U32 $final ($h + 24) 0
    Set-U32 $final ($h + 28) 0
    Set-U16 $final ($h + 32) 0
    Set-U16 $final ($h + 34) 0
    Set-U32 $final ($h + 36) 0x40000040

    Set-U16 $final ($peOff + 6) ([uint16]($numSections + 1))
    $sizeOfImage = [int64]$newSec.vaddr + [int64]$newSec.vsize
    $sizeOfImage = [int64]([Math]::Ceiling($sizeOfImage / $sectionAlignment) * $sectionAlignment)
    Set-U32 $final ($optHdr + 56) ([uint32]$sizeOfImage)
    $initData = [uint32](Get-U32 $final ($optHdr + 8)) + [uint32]$rawSize
    Set-U32 $final ($optHdr + 8) $initData

    # --- repoint the RIP-relative references
    $n = 0
    foreach ($prop in $plan.relocs.PSObject.Properties) {
        $label = $prop.Name
        if (-not $relocs.ContainsKey($label)) { Write-Host ("  !! no relocation for " + $label); continue }
        $newRva = $relocs[$label]
        foreach ($q in $prop.Value) {
            $q = [int]$q
            $nextRva = To-Rva ([int64]($q + 4))
            if ($nextRva -lt 0) { Write-Host ("  !! ref out of section: " + $label); continue }
            $disp = $newRva - $nextRva
            Set-U32 $final $q ([uint32]([int64]$disp -band 0xFFFFFFFFL))
            $n++
        }
    }
    Write-Host ("  repointed {0} RIP references" -f $n)

    [System.IO.File]::WriteAllBytes($dst, $final)
    return $final.Length
}

# ---------------------------------------------------------------- data.win
function Patch-DataWin([string]$src, [string]$dst) {
    if (-not (Test-Path $utmt)) { throw "UndertaleModCli.exe not found: $utmt" }
    $csx = Join-Path $payload 'patch_datawin.csx'
    $env:FE_PAYLOAD_DIR = $payload
    if (Test-Path $dst) { Remove-Item -Force $dst }
    Write-Host '  running UndertaleModCli ...'
    $out = & $utmt 'load' $src '-s' $csx '-o' $dst '-f' 2>&1
    $out | ForEach-Object { Write-Host ("    " + $_) }
    if (-not (Test-Path $dst)) { throw 'data.win rebuild failed (no output file)' }
    return (Get-Item $dst).Length
}

# ---------------------------------------------------------------- actions
function Test-GameRunning {
    $p = Get-Process -Name 'False Echo' -ErrorAction SilentlyContinue
    return ($null -ne $p)
}

switch ($Action) {

    'verify' {
        $exeHash = Get-Sha256 $exePath
        $winHash = Get-Sha256 $winPath
        Write-Host ("False Echo.exe  SHA256 {0}  ({1} bytes)" -f $exeHash, (Get-Item $exePath).Length)
        Write-Host ("data.win      SHA256 {0}  ({1} bytes)" -f $winHash, (Get-Item $winPath).Length)
        break
    }

    'restore' {
        if (-not (Test-Path (Join-Path $backupDir 'False Echo.exe'))) { Write-Host 'No backup found.'; exit 3 }
        Copy-Item (Join-Path $backupDir 'False Echo.exe') $exePath -Force
        Copy-Item (Join-Path $backupDir 'data.win') $winPath -Force
        Say 'M_RESTORE'
        break
    }

    'install' {
        if (Test-GameRunning) { Say 'M_RUNNING'; exit 4 }

        $exp = Get-Content (Join-Path $payload 'expected_hashes.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        $exeHash = Get-Sha256 $exePath
        $winHash = Get-Sha256 $winPath
        $needExe = ($exeHash -ne $exp.patchedExe)
        $needWin = ($winHash -ne $exp.patchedWin)
        if (-not $needExe -and -not $needWin) { Say 'M_ALREADY'; exit 0 }
        if ($needExe -and $exeHash -ne $exp.originalExe) {
            Say 'M_HASHWARN'
            Write-Host '  Aborting: this patch does not match the installed game build.'
            exit 5
        }

        if (-not (Test-Path (Join-Path $backupDir 'False Echo.exe'))) {
            Say 'M_BACKUP'
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            Copy-Item $exePath (Join-Path $backupDir 'False Echo.exe') -Force
            Copy-Item $winPath (Join-Path $backupDir 'data.win') -Force
        }

        $tmpExe = $null; $tmpWin = $null
        if ($needExe) {
            Say 'M_EXE'
            $tmpExe = Join-Path $game 'False Echo.cn.tmp'
            $sz = Patch-Exe $exePath $tmpExe
            Write-Host ("  exe rebuilt: {0} bytes" -f $sz)
        }
        if ($needWin) {
            Say 'M_DW'
            $tmpWin = Join-Path $game 'data.cn.tmp'
            $sz2 = Patch-DataWin $winPath $tmpWin
            Write-Host ("  data.win rebuilt: {0} bytes" -f $sz2)
        }

        if ($tmpExe) { Copy-Item $tmpExe $exePath -Force; Remove-Item -Force $tmpExe -ErrorAction SilentlyContinue }
        if ($tmpWin) { Copy-Item $tmpWin $winPath -Force; Remove-Item -Force $tmpWin -ErrorAction SilentlyContinue }

        Say 'M_DONE'
        Write-Host ''
        Write-Host ("  False Echo.exe  {0} bytes  SHA256 {1}" -f (Get-Item $exePath).Length, (Get-Sha256 $exePath))
        Write-Host ("  data.win      {0} bytes  SHA256 {1}" -f (Get-Item $winPath).Length, (Get-Sha256 $winPath))
        break
    }
}
Write-Host ''
exit 0

