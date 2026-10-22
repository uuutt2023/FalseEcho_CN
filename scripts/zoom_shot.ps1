$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class Zoom {
    public static void Go(string src, string dst, int x, int y, int w, int h, int zoom) {
        using (var s = new Bitmap(src))
        using (var b = new Bitmap(w * zoom, h * zoom, PixelFormat.Format32bppArgb)) {
            using (var g = Graphics.FromImage(b)) {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(s, new Rectangle(0, 0, w * zoom, h * zoom),
                            new Rectangle(x, y, w, h), GraphicsUnit.Pixel);
            }
            b.Save(dst, ImageFormat.Png);
        }
    }
}
'@
$p = 'E:\FalseEcho_CN\drv\out\s03_endless_opts.png'
# 第 3 行含 Discord：物理坐标 x 约 600..760, y 约 335..365
[Zoom]::Go($p, 'E:\FalseEcho_CN\drv\out\z_discord.png', 590, 330, 180, 40, 6)
Write-Host 'z_discord.png written'
