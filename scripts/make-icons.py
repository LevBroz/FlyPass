"""Genera iconos originales de la app (sello punteado + check) con Pillow.
Uso: python scripts/make-icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "apps" / "mobile" / "assets"
NAVY = (16, 42, 53, 255)
GOLD = (220, 174, 100, 255)
GREEN = (0, 165, 156, 255)
S = 1024


def stamp(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, ring, check, width: int):
    # Anillo punteado
    n = 28
    for i in range(n):
        a0 = i / n * 360
        draw.arc([cx - r, cy - r, cx + r, cy + r], a0, a0 + 360 / n * 0.62, fill=ring, width=width)
    # Anillo interior fino
    ri = r * 0.82
    draw.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], outline=ring, width=max(4, width // 3))
    # Check
    pts = [(cx - r * 0.38, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.3), (cx + r * 0.42, cy - r * 0.32)]
    draw.line(pts, fill=check, width=int(width * 1.5), joint="curve")
    for p in (pts[0], pts[2]):
        w = width * 0.75
        draw.ellipse([p[0] - w, p[1] - w, p[0] + w, p[1] + w], fill=check)


def full_icon():
    img = Image.new("RGBA", (S, S), NAVY)
    d = ImageDraw.Draw(img)
    stamp(d, S / 2, S / 2, S * 0.33, GOLD, GREEN, 44)
    img.save(OUT / "icon.png")
    img.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")


def adaptive():
    fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    stamp(ImageDraw.Draw(fg), S / 2, S / 2, S * 0.24, GOLD, GREEN, 34)  # zona segura ~66%
    fg.save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (S, S), NAVY).save(OUT / "android-icon-background.png")
    mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    white = (255, 255, 255, 255)
    stamp(ImageDraw.Draw(mono), S / 2, S / 2, S * 0.24, white, white, 34)
    mono.save(OUT / "android-icon-monochrome.png")


def splash():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    stamp(ImageDraw.Draw(img), S / 2, S / 2, S * 0.4, GOLD, GREEN, 52)
    img.save(OUT / "splash-icon.png")


if __name__ == "__main__":
    full_icon()
    adaptive()
    splash()
    print("iconos generados en", OUT)
