"""
Generate all app icons from a source photo.
Usage: python scripts/make_icons_from_photo.py
"""
from PIL import Image
import os

SRC = r"C:\Users\digit\OneDrive\Desktop\Template Doc\Abuild dcreens\Sigidrigi App\pics\icon.png"
ANDROID_RES = r"C:\Users\digit\sigidrigi\android\app\src\main\res"
IOS_ICON = r"C:\Users\digit\sigidrigi\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png"
PLAY_ICON = r"C:\Users\digit\sigidrigi\docs\store-assets\icon-512.png"

img = Image.open(SRC).convert("RGB")

# ── Play Store — 512x512 ──────────────────────────────────────────────
os.makedirs(os.path.dirname(PLAY_ICON), exist_ok=True)
img.resize((512, 512), Image.LANCZOS).save(PLAY_ICON)
print(f"Play Store icon: {PLAY_ICON}")

# ── iOS — 1024x1024 ──────────────────────────────────────────────────
os.makedirs(os.path.dirname(IOS_ICON), exist_ok=True)
img.resize((1024, 1024), Image.LANCZOS).save(IOS_ICON)
print(f"iOS icon: {IOS_ICON}")

# ── Android mipmap launcher icons ────────────────────────────────────
# Standard launcher sizes: mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192
MIPMAP_SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in MIPMAP_SIZES.items():
    resized = img.resize((size, size), Image.LANCZOS)
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        out = os.path.join(ANDROID_RES, folder, name)
        resized.save(out)
    print(f"{folder}: {size}x{size}")

# Foreground for adaptive icon — 108dp safe zone, content fills 72dp centre
# At xxxhdpi scale that's 432x432 total, icon content in centre 288x288
# Simplest: resize to 432x432 with padding so safe-zone content is centred
for folder, size in MIPMAP_SIZES.items():
    adaptive_size = int(size * 432 / 192)  # scale proportionally from xxxhdpi
    pad = int((adaptive_size - size) / 2)
    canvas = Image.new("RGB", (adaptive_size, adaptive_size), (10, 10, 10))
    canvas.paste(img.resize((size, size), Image.LANCZOS), (pad, pad))
    out = os.path.join(ANDROID_RES, folder, "ic_launcher_foreground.png")
    canvas.save(out)

print("\nAll icons generated successfully!")
