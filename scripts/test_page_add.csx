using System.Text;
using System.Linq;
using UndertaleModLib.Models;
using UndertaleModLib.Util;

// ---------- 1. 替换字符串 ----------
int target = -1;
for (int i = 0; i < Data.Strings.Count; i++)
    if (Data.Strings[i].Content == "No public bulletin is available for this date.")
    { target = i; break; }
Console.WriteLine("目标字符串下标: " + target);
if (target >= 0) Data.Strings[target].Content = "本日没有公开公告。";

// ---------- 2. 新增纹理页 ----------
var newPage = new UndertaleEmbeddedTexture();
newPage.Name = Data.Strings.MakeString("Texture_CN");
newPage.TextureData.Image = new GMImage(2048, 2048).ConvertToFormat(GMImage.ImageFormat.Png);
Data.EmbeddedTextures.Add(newPage);
Console.WriteLine("EmbeddedTextures.Count = " + Data.EmbeddedTextures.Count);

var tpi = new UndertaleTexturePageItem();
tpi.Name = Data.Strings.MakeString("PageItem_CN");
tpi.SourceX = 0; tpi.SourceY = 0;
tpi.SourceWidth = 2048; tpi.SourceHeight = 2048;
tpi.TargetX = 0; tpi.TargetY = 0;
tpi.TargetWidth = 2048; tpi.TargetHeight = 2048;
tpi.BoundingWidth = 2048; tpi.BoundingHeight = 2048;
tpi.TexturePage = newPage;
Data.TexturePageItems.Add(tpi);
Console.WriteLine("TexturePageItems.Count = " + Data.TexturePageItems.Count);

// ---------- 3. 把某个字体指向新页并加一个字形 ----------
var font = Data.Fonts.FirstOrDefault(f => f.Name?.Content == "fnt_ContentText");
if (font != null)
{
    Console.WriteLine("找到字体 fnt_ContentText，原字形数 " + font.Glyphs.Count);
    var g = new UndertaleFont.Glyph();
    g.Character = 0x4E2D; // 中
    g.SourceX = 0; g.SourceY = 0; g.SourceWidth = 12; g.SourceHeight = 12;
    g.Shift = 12; g.Offset = 0;
    font.Glyphs.Add(g);
    font.Texture = tpi;
    Console.WriteLine("新字形数 " + font.Glyphs.Count);
}
Console.WriteLine("OK");
