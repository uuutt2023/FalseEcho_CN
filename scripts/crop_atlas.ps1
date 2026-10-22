$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class AtlasProbe {
    // 统计指定图集区域内非透明像素数，并导出放大图（黑底 + alpha 合成，便于目视）
    public static string Probe(string src, string dst, int x, int y, int w, int h, int zoom) {
        using (var s = new Bitmap(src))
        using (var b = new Bitmap(w * zoom, h * zoom, PixelFormat.Format32bppArgb)) {
            int ink = 0, inkY0 = -1, inkY1 = -1, maxA = 0;
            for (int yy = 0; yy < h; yy++)
                for (int xx = 0; xx < w; xx++) {
                    Color p = s.GetPixel(x + xx, y + yy);
                    if (p.A > 0) { ink++; if (inkY0 < 0) inkY0 = yy; inkY1 = yy; if (p.A > maxA) maxA = p.A; }
                }
            using (var g = Graphics.FromImage(b)) {
                g.Clear(Color.FromArgb(255, 20, 24, 20));
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(s, new Rectangle(0, 0, w * zoom, h * zoom),
                            new Rectangle(x, y, w, h), GraphicsUnit.Pixel);
            }
            b.Save(dst, ImageFormat.Png);
            return "ink=" + ink + " rows=" + inkY0 + ".." + inkY1 + " maxAlpha=" + maxA;
        }
    }
}
'@
Write-Host ('ark12 : ' + [AtlasProbe]::Probe('E:\FalseEcho_CN\fontout_ark12\atlas_0.png', 'E:\FalseEcho_CN\fontout_ark12\cells.png', 0, 0, 130, 40, 8))
Write-Host ('fixhei: ' + [AtlasProbe]::Probe('E:\FalseEcho_CN\fontout_fix\atlas_0.png', 'E:\FalseEcho_CN\fontout_fix\cells.png', 0, 0, 130, 40, 8))
