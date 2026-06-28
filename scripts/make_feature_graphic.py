"""Google Play feature graphic — 1024x500.
On-brand: dark base, a Pacific photo fading in from the right, Sigidrigi
wordmark + tagline on the left. Run: python scripts/make_feature_graphic.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 500
ACCENT = (0, 229, 160)
DARK = (10, 10, 10)

base = Image.new('RGB', (W, H), DARK)

# Right-side photo (palm beach), scaled to cover, then darkened with a
# left-to-right gradient so the left stays solid for text.
photo_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'cards', 'card3.jpg')
try:
    photo = Image.open(photo_path).convert('RGB')
    # cover-fit to WxH
    pr, br = photo.width / photo.height, W / H
    if pr > br:
        nh = H; nw = int(H * pr)
    else:
        nw = W; nh = int(W / pr)
    photo = photo.resize((nw, nh)).crop((0, 0, W, H))
    base.paste(photo, (0, 0))

    # Dark gradient: fully dark on the left, ~25% on the far right.
    grad = Image.new('L', (W, 1), 0)
    for x in range(W):
        t = x / W
        a = int(252 - t * (252 - 70))      # 252 → 70
        if x < 430:                         # keep the text zone solid
            a = 248
        grad.putpixel((x, 0), a)
    grad = grad.resize((W, H))
    overlay = Image.new('RGB', (W, H), DARK)
    base = Image.composite(overlay, base, grad)
except FileNotFoundError:
    pass

d = ImageDraw.Draw(base)

def font(path, size):
    for p in [path, os.path.join('C:\\Windows\\Fonts', path)]:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()

title_font = font('georgiab.ttf', 110)
tag_font = font('segoeuib.ttf', 36)
sub_font = font('segoeui.ttf', 27)

PAD = 64
# small uppercase kicker
d.text((PAD, 150), 'THE FIJIAN SONGBOOK', font=sub_font, fill=ACCENT)
# wordmark
d.text((PAD, 188), 'Sigidrigi', font=title_font, fill=(245, 245, 245))
# tagline
d.text((PAD, 322), 'Sing along, offline', font=tag_font, fill=(245, 245, 245))
d.text((PAD, 372), 'Lyrics  ·  Sing Mode  ·  199+ songs', font=sub_font, fill=(180, 180, 180))
# teal accent underline
d.rectangle([PAD, 305, PAD + 150, 309], fill=ACCENT)

out_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'store-assets')
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, 'feature-graphic.png')
base.save(out)
print(f'Saved feature graphic: {os.path.abspath(out)} ({base.size[0]}x{base.size[1]})')
