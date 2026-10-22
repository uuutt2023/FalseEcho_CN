$ErrorActionPreference = 'Stop'
$path = 'E:\FalseEcho_CN\backup_original\data.win'
$fs = [System.IO.File]::OpenRead($path)
$br = New-Object System.IO.BinaryReader($fs)
$p = 8
while ($p + 8 -lt $fs.Length) {
    $fs.Position = $p
    $id = [System.Text.Encoding]::ASCII.GetString($br.ReadBytes(4))
    $len = $br.ReadInt32()
    if ($id -eq 'SCPT') {
        Write-Output ("SCPT at {0}, len {1}" -f $p, $len)
        $dataStart = $p + 8
        $fs.Position = $dataStart
        $n = $br.ReadInt32()
        Write-Output ("first uint32 = {0}" -f $n)
        $fs.Position = $dataStart
        $buf = $br.ReadBytes(256)
        $hex = ($buf | ForEach-Object { $_.ToString('x2') }) -join ' '
        Write-Output $hex
        # try to read as: count, then strings (length-prefixed, 4-aligned)
        $fs.Position = $dataStart
        $cnt = $br.ReadInt32()
        Write-Output ("count = {0}" -f $cnt)
        for ($i = 0; $i -lt 3; $i++) {
            $sl = $br.ReadInt32()
            $s = [System.Text.Encoding]::UTF8.GetString($br.ReadBytes($sl))
            $pad = (4 - ($sl % 4)) % 4
            if ($pad -gt 0) { $br.ReadBytes($pad) | Out-Null }
            Write-Output ("  name[{0}] len={1} : {2}" -f $i, $sl, $s)
        }
        Write-Output ("position after 3 names: {0} (chunk data end {1})" -f $fs.Position, ($dataStart + $len))
        break
    }
    $p += 8 + $len
}
$br.Close(); $fs.Close()
