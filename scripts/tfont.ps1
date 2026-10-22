Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$ch = [string][char]0x90E8   # U+90E8

function Test-Font([string]$path, [float]$px, [string]$outName) {
  if (-not (Test-Path $path)) { Write-Output "MISSING $path"; return }
  $bmp = New-Object System.Drawing.Bitmap 120, 24
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Black)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
  $f = New-Object System.Drawing.Font($path, $px, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString(($ch * 5), $f, [System.Drawing.Brushes]::White, 1, 1)
  $g.Dispose()
  $fam = $f.Name
  $f.Dispose()
  $out = "E:\FalseEcho_CN\out\" + $outName
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ($outName + " : family=" + $fam + "  size=" + $px)
}

Test-Font 'E:\FalseEcho_CN\fonts\fusion8\fusion-pixel-8px-proportional-zh_hans.ttf' 8 'tf_fusion8.png'
Test-Font 'E:\FalseEcho_CN\fonts\ark10\ark-pixel-10px-proportional-zh_hans.ttf' 8 'tf_ark10_at8.png'
Test-Font 'E:\FalseEcho_CN\fonts\ark10\ark-pixel-10px-proportional-zh_hans.ttf' 10 'tf_ark10_at10.png'
Test-Font 'E:\FalseEcho_CN\fonts\ark12\ark-pixel-12px-proportional-zh_hans.ttf' 12 'tf_ark12_at12.png'
Test-Font 'C:\Windows\Fonts\simhei.ttf' 10 'tf_simhei_at10.png'
