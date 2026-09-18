"""
Cuts every app icon out of one source logo. Run after replacing the source:

    python scripts/build-brand-assets.py [path-to-logo]

Defaults to brand/nexora-logo.jpg, the canonical artwork. It stays a JPEG
because the glow render is photographic: the same image as PNG is six times the
bytes for no visible gain. Everything it writes is generated - never hand-edit
the icons, re-run this.

The full badge carries the wordmark and the tagline, which turn to mush below
about 128px, so anything small is cropped to the N mark alone. The crop box is
found from the artwork rather than hard-coded, so a re-export that shifts the
mark still lands.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "brand/nexora-logo.jpg"

# sampled from the badge interior of the artwork
BADGE_GROUND = "#030214"


def mark_square(im: Image.Image) -> Image.Image:
    """
    The N mark, centred on a square of the badge's own dark ground.

    The mark is wider than it is tall, so squaring its bounding box pulls the
    frame down into the wordmark and slices it in half at 128px. Padding onto a
    square canvas instead keeps the mark centred and lets nothing else in.

    The gradient ring is the same cyan and blue as the mark, so the search is
    capped well inside it: the ring sits at about 0.435 of the width from
    centre, the mark inside 0.30.
    """
    w, h = im.size
    mx, my = w / 2, h / 2
    limit = min(w, h) * 0.32
    xs, ys = [], []
    for y in range(int(h * 0.12), int(h * 0.55), 2):
        for x in range(0, w, 2):
            if (x - mx) ** 2 + (y - my) ** 2 > limit**2:
                continue
            r, g, b = im.getpixel((x, y))
            if b > 200 and (b - r) > 90:  # the lit mark, not the ambient glow
                xs.append(x)
                ys.append(y)
    if not xs:
        raise SystemExit("no mark pixels found - check the source artwork")

    margin = int(max(max(xs) - min(xs), max(ys) - min(ys)) * 0.10)
    tight = im.crop((min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin))
    side = max(tight.size)
    square = Image.new("RGB", (side, side), BADGE_GROUND)
    square.paste(tight, ((side - tight.width) // 2, (side - tight.height) // 2))
    return square


def save(im: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.resize((size, size), Image.LANCZOS).save(path)
    print(f"  {path.relative_to(ROOT)}  {size}x{size}")


def main() -> None:
    full = Image.open(SRC).convert("RGB")
    mark = mark_square(full)
    print(f"source {SRC.name} {full.size}, mark crop {mark.size}")

    print("\nweb:")
    save(full, ROOT / "apps/web/public/logo.png", 512)
    save(mark, ROOT / "apps/web/public/favicon.png", 64)

    print("\nmobile:")
    save(full, ROOT / "apps/mobile/assets/icon.png", 1024)
    # Android masks the adaptive foreground to a circle and crops ~33%, so the
    # mark needs the padding the full badge does not leave it.
    pad = Image.new("RGB", (int(mark.width * 1.5),) * 2, BADGE_GROUND)
    pad.paste(mark, ((pad.width - mark.width) // 2,) * 2)
    save(pad, ROOT / "apps/mobile/assets/adaptive-icon.png", 1024)
    save(mark, ROOT / "apps/mobile/assets/favicon.png", 64)
    save(full, ROOT / "apps/mobile/assets/splash.png", 512)

    print("\nextension:")
    for size in (16, 32, 48, 128):
        save(mark, ROOT / f"apps/extension/icons/icon{size}.png", size)


if __name__ == "__main__":
    main()
