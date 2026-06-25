from PIL import Image, ImageDraw

# iOS app icon: 1024x1024, fully opaque, square corners (iOS applies the mask).
size = 1024
img = Image.new('RGB', (size, size), '#0A0A0A')
d = ImageDraw.Draw(img)

# Teal glow behind the note
cx, cy = size // 2, int(size * 0.46)
glow = int(size * 0.34)
glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_img)
gd.ellipse([cx - glow, cy - glow, cx + glow, cy + glow], fill=(0, 229, 160, 30))
img.paste(Image.alpha_composite(img.convert('RGBA'), glow_img).convert('RGB'), (0, 0))
d = ImageDraw.Draw(img)

# Music note (matches the Android launcher icon)
nh = int(size * 0.18)
nw = int(size * 0.22)
nx = int(size * 0.34)
ny = int(size * 0.56)
d.ellipse([nx, ny, nx + nw, ny + nh], fill='#00E5A0')

sw = int(size / 28)
sx = nx + nw - sw
d.rectangle([sx, ny - int(size * 0.34), sx + sw, ny + nh // 2], fill='#00E5A0')

flag_x = sx + sw
flag_y = ny - int(size * 0.34)
d.line([(flag_x, flag_y), (sx + int(size * 0.22), flag_y + int(size * 0.14))], fill='#00E5A0', width=sw)

out = r'C:\Users\digit\sigidrigi\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png'
img.save(out)
print(f'Saved iOS icon: {out} ({img.size[0]}x{img.size[1]}, mode={img.mode})')
