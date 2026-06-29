"""Google Play feature graphic — 1024x500.
Uses the Sigidrigi icon artwork (guitar/sunset) on the right,
dark gradient left side for text.
Run: python scripts/make_feature_graphic.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 500
ACCENT = (0, 229, 160)
DARK = (10, 10, 10)

SRC = r"C:\Users\digit\OneDrive\Desktop\Template Doc\Abuild dcreens\Sigidrigi App\pics\icon.png"

base = Image.new("RGB", (W, H), DARK)

# Load source artwork — scale to fill height, anchor right
photo = Image.open(SRC).convert("RGB")
scale = H / photo.height
new_w = int(photo.width * scale)
photo = photo.resize((new_w, H), Image.LANCZOS)
# Paste flush to the right edge
paste_x = W - new_w
base.paste(photo, (paste_x, 0))

# Gradient overlay: fully dark on left, fades to transparent on right
grad = Image.new("L", (W, 1), 0)
for x in range(W):
    if x < 420:
        a = 255
    elif x < 650:
        a = int(255 - (x - 420) / 230 * 220)
    else:
        a = max(int(35 - (x - 650) / (W - 650) * 20), 15)
    grad.putpixel((x, 0), a)
grad = grad.resize((W, H))
overlay = Image.new("RGB", (W, H), DARK)
base = Image.composite(overlay, base, grad)

d = ImageDraw.Draw(base)

def font(name, size):
    for path in [name, os.path.join("C:\\Windows\\Fonts", name)]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()

f_kicker = font("segoeuib.ttf", 22)
f_title  = font("georgiab.ttf", 108)
f_tag    = font("segoeuib.ttf", 34)
f_sub    = font("segoeui.ttf",  24)

PAD, Y = 56, 130

d.text((PAD, Y),         "THE FIJIAN SONGBOOK",          font=f_kicker, fill=ACCENT)
d.text((PAD, Y + 34),    "Sigidrigi",                    font=f_title,  fill=(245, 245, 245))
d.rectangle([PAD, Y + 155, PAD + 160, Y + 160],          fill=ACCENT)
d.text((PAD, Y + 172),   "Sing along. Offline.",          font=f_tag,    fill=(245, 245, 245))
d.text((PAD, Y + 222),   "Lyrics  ·  Sing Mode  ·  199+ songs", font=f_sub, fill=(180, 180, 180))

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "store-assets", "feature-graphic.png"))
base.save(out)
print(f"Saved: {out} ({W}x{H})")
