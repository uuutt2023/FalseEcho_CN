$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public static class RowProbe {
    public static string Probe(string path, int x0, int x1, int y0, int y1, int thresh) {
        using (var src = new Bitmap(path))
        using (var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0);
            var bands = new List<string>();
            bool inRun = false; int start = 0;
            for (int y = y0; y < y1; y++) {
                int cnt = 0;
                for (int x = x0; x < x1; x++) {
                    Color p = bmp.GetPixel(x, y);
                    if (p.R > thresh && p.G > thresh && p.B > thresh) cnt++;
                }
                bool has = cnt > 3;
                if (has && !inRun) { inRun = true; start = y; }
                else if (!has && inRun) { inRun = false; bands.Add(start + ".." + (y - 1) + " h=" + (y - start)); }
            }
            if (inRun) bands.Add(start + ".." + (y1 - 1) + " h=" + (y1 - start));
            return string.Join(" | ", bands.ToArray());
        }
    }
}
'@

$p = 'E:\FalseEcho_CN\drv\out\s03_endless_opts.png'
Write-Host ("img      : " + ([System.Drawing.Image]::FromFile($p)).Width + "x" + ([System.Drawing.Image]::FromFile($p)).Height)
Write-Host ("body-cn  : " + [RowProbe]::Probe($p, 176, 960, 215, 265, 110))
Write-Host ("latin    : " + [RowProbe]::Probe($p, 600, 700, 330, 385, 110))
Write-Host ("cn-same  : " + [RowProbe]::Probe($p, 176, 300, 330, 385, 110))
Write-Host ("title    : " + [RowProbe]::Probe($p, 555, 750, 115, 180, 110))
Write-Host ("subtitle : " + [RowProbe]::Probe($p, 585, 715, 172, 200, 110))
