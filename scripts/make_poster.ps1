# ============================================================================
# make_poster.ps1 —— 生成 1:1 的《虚妄回响》简体中文补丁宣传图
#   主视觉：游戏标题页美术（潜艇剪影 / 海面）
#   图标：  从 exe 提取的应用图标
#   内容：  当前补丁已实现的功能清单（程序化排版，中文文字准确）
#   输出：  out\FalseEcho_CN_Patch_Poster.png  (1200x1200)
# ============================================================================
param(
    [string]$ArtPath = 'E:\FalseEcho_CN\drv\out\cn11_boot.png',
    [string]$ExePath = 'E:\FalseEcho_CN\backup_newbuild\False Echo.exe',
    [string]$Out = 'E:\FalseEcho_CN\out\FalseEcho_CN_Patch_Poster.png'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$S = 1200
$bmp = New-Object System.Drawing.Bitmap($S, $S)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# ---------------------------------------------------------------- 背景
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 12, 16, 28))
$g.FillRectangle($bg, 0, 0, $S, $S)

# ---------------------------------------------------------------- 主视觉：标题页美术
$bandH = 560
if (Test-Path $ArtPath) {
    $artImg = [System.Drawing.Image]::FromFile($ArtPath)
    # 等比缩放到画布宽度，顶部对齐；下半部分会被信息板盖住
    $scale = $S / [double]$artImg.Width
    $dw = $S
    $dh = [int]($artImg.Height * $scale)
    $g.DrawImage($artImg, 0, 0, $dw, $dh)
    $artImg.Dispose()
}

# 顶部渐隐压暗，让标题更清晰
$shade = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)), (New-Object System.Drawing.Point(0, $bandH)),
    [System.Drawing.Color]::FromArgb(150, 5, 8, 16), [System.Drawing.Color]::FromArgb(255, 5, 8, 16))
$g.FillRectangle($shade, 0, 0, $S, $bandH)

# 细网格（仪表盘质感）
$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 120, 170, 210), 1)
for ($x = 0; $x -lt $S; $x += 40) { $g.DrawLine($gridPen, $x, 0, $x, $bandH) }
for ($y = 0; $y -lt $bandH; $y += 40) { $g.DrawLine($gridPen, 0, $y, $S, $y) }
$gridPen.Dispose()

# ---------------------------------------------------------------- 底部信息板
$panelY = $bandH - 40
$panel = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, $panelY)), (New-Object System.Drawing.Point(0, $S)),
    [System.Drawing.Color]::FromArgb(252, 10, 14, 24), [System.Drawing.Color]::FromArgb(252, 22, 30, 46))
$g.FillRectangle($panel, 0, $panelY, $S, $S - $panelY)

# 分隔线
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 214, 178, 96), 3)
$g.DrawLine($linePen, 60, $panelY + 2, $S - 60, $panelY + 2)
$linePen.Dispose()

# ---------------------------------------------------------------- 字体
$fZh   = New-Object System.Drawing.Font('Microsoft YaHei', 52, [System.Drawing.FontStyle]::Bold)
$fZh2  = New-Object System.Drawing.Font('Microsoft YaHei', 27, [System.Drawing.FontStyle]::Bold)
$fBody = New-Object System.Drawing.Font('Microsoft YaHei', 22)
$fLat  = New-Object System.Drawing.Font('Consolas', 19)
$fTag  = New-Object System.Drawing.Font('Microsoft YaHei', 20, [System.Drawing.FontStyle]::Bold)

$cWhite  = [System.Drawing.Color]::FromArgb(255, 238, 242, 250)
$cDim    = [System.Drawing.Color]::FromArgb(255, 158, 172, 196)
$cGold   = [System.Drawing.Color]::FromArgb(255, 226, 186, 104)
$cCyan   = [System.Drawing.Color]::FromArgb(255, 120, 196, 214)

$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# ---------------------------------------------------------------- 文本
$y = $panelY + 30
$g.DrawString('虚妄回响', $fZh, (New-Object System.Drawing.SolidBrush($cWhite)), 60, $y)
$g.DrawString('False Echo', $fLat, (New-Object System.Drawing.SolidBrush($cCyan)), 330, $y + 16)

$g.DrawString('简体中文汉化补丁 · 一键注入版', $fZh2, (New-Object System.Drawing.SolidBrush($cGold)), 60, ($y + 66))
$g.DrawString('v0.9.8.6  |  Steam AppID 5072320  |  覆盖 Demo 全流程', $fLat, (New-Object System.Drawing.SolidBrush($cDim)), 62, ($y + 102))

$items = @(
    @('全量文本汉化', '9 个烘焙文本块 + 448 条界面/剧情字面量'),
    @('中文字形图集', '12 款字体、1786 汉字，行高按中文墨迹自适应'),
    @('纸面电传 · 每日命令 · 名册 · 战争日记 · 前线新闻', '全部中文化，密文与校验键按规则保留原文'),
    @('断行算法重写', '按英文原行宽预算分词：纸面不再叠字，宽对话框不再硬断行'),
    @('一键注入补丁', '解压到游戏根目录，双击 Install-CN.cmd，自带运行时'),
    @('安全可回滚', '指纹不符自动拒绝安装，原版自动备份，Restore-CN.cmd 还原')
)

$iy = $y + 148
$bullet = New-Object System.Drawing.SolidBrush($cGold)
foreach ($it in $items) {
    $g.FillRectangle($bullet, 62, ($iy + 9), 7, 7)
    $g.DrawString($it[0], $fTag, (New-Object System.Drawing.SolidBrush($cWhite)), 84, $iy)
    $g.DrawString($it[1], $fBody, (New-Object System.Drawing.SolidBrush($cDim)), 84, ($iy + 28))
    $iy += 62
}

# 底部条
$barPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 214, 178, 96), 1)
$g.DrawLine($barPen, 60, ($S - 62), $S - 60, ($S - 62))
$barPen.Dispose()
$g.DrawString('FalseEcho-CN-Patch-v0986.zip   63 MB   纯脚本注入，不分发修改后的游戏程序',
    $fLat, (New-Object System.Drawing.SolidBrush($cDim)), 62, ($S - 50))

# ---------------------------------------------------------------- 应用图标
if (Test-Path $ExePath) {
    try {
        $ico = [System.Drawing.Icon]::ExtractAssociatedIcon($ExePath)
        if ($ico) {
            $icon = $ico.ToBitmap()
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
            $g.DrawImage($icon, 1060, 40, 96, 96)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
            $icon.Dispose(); $ico.Dispose()
        }
    } catch { Write-Host ('图标提取失败: ' + $_.Exception.Message) }
}

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host ('written: ' + $Out + '  (' + (Get-Item $Out).Length + ' bytes)')
