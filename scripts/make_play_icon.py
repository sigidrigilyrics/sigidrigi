"""Google Play app icon — 512x512 PNG (matches the launcher/iOS music note)."""
import os
from PIL import Image, ImageDraw

size = 512
img = Image.new('RGB', (size, size), '#0A0A0A')

# Teal glow
cx, cy = size // 2, int(size * 0.46)
glow = int(size * 0.34)
glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_img)
gd.ellipse([cx - glow, cy - glow, cx + glow, cy + glow], fill=(0, 229, 160, 30))
img = Image.alpha_composite(img.convert('RGBA'), glow_img).convert('RGB')
d = ImageDraw.Draw(img)

# Music note
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

out_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'store-assets')
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, 'icon-512.png')
img.save(out)
print(f'Saved Play icon: {os.path.abspath(out)} ({img.size[0]}x{img.size[1]})')
