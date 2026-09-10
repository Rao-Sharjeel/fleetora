import io
from collections import Counter
from dataclasses import dataclass

import pytesseract
from PIL import Image, ImageOps

# Tesseract's word-level confidence is not usable as a trust signal here, which
# is worth recording because it looks like one. Measured on rendered odometer
# crops: digits alone score 96, but the same digits read perfectly next to a
# "km" label score 0 — the unit glyph poisons the score without affecting the
# digits. So confidence is only used to discard outright non-text noise, and
# the reading is trusted on the shape of what came back instead.
MIN_WORD_CONFIDENCE = 0

# An odometer is realistically 4-7 digits: below that it's a partial read of a
# few digits, above it we've swept in a trip meter or a speedometer number too.
MIN_DIGITS = 4
MAX_DIGITS = 7

# Guards a thin-RAM droplet against a huge decoded-image payload.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

# Only rescue genuinely tiny crops. The previous 200px floor actively hurt:
# measured on a rendered odometer crop, the digits read correctly at their
# native 130px and not at all once upscaled to 200px or beyond — the
# interpolation smears the glyph edges Tesseract keys on.
MIN_IMAGE_HEIGHT = 64

# No single page-segmentation mode is reliable here. On the same crop, PSM 8
# and 13 read "134700" correctly while 6, 7 and 11 returned nothing; on other
# crops the winners differ. Running several and comparing is both more accurate
# and gives a real confidence signal, which Tesseract's own score isn't.
PSM_MODES = (7, 8, 13, 6)


class OdometerImageTooLarge(Exception):
    pass


@dataclass
class OdometerReading:
    reading: str | None
    confident: bool


def extract_odometer_reading(image_bytes: bytes) -> OdometerReading:
    """Best-effort digit-only OCR of an odometer photo (ideally already cropped
    to just the digit display client-side — accuracy degrades on a full,
    uncropped dashboard photo, but the contract here doesn't depend on that).

    Runs entirely on Tesseract (a lightweight C++ OCR engine, not a
    deep-learning framework) — PaddleOCR/docTR/etc. would read real-world
    photos more accurately, but each loads a full neural-net runtime into
    memory, which the production droplet's RAM margin can't absorb.
    """
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise OdometerImageTooLarge(f"Image exceeds {MAX_IMAGE_BYTES} bytes.")

    image = Image.open(io.BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image)  # phone photos carry rotation in EXIF, not pixels
    image = image.convert("L")  # grayscale — colour adds nothing for digit OCR here

    if image.height < MIN_IMAGE_HEIGHT:
        scale = MIN_IMAGE_HEIGHT / image.height
        image = image.resize((round(image.width * scale), MIN_IMAGE_HEIGHT), Image.LANCZOS)

    image = ImageOps.autocontrast(image)

    return choose_reading([_read_digits(image, psm) for psm in PSM_MODES])


def choose_reading(candidates: list[str]) -> OdometerReading:
    """Picks the reading several segmentation modes agree on.

    Split out from the OCR itself so the voting rules can be tested without
    depending on Tesseract or on which fonts a machine happens to have.
    """
    readings = [c for c in candidates if c]
    if not readings:
        return OdometerReading(reading=None, confident=False)

    plausible = [r for r in readings if MIN_DIGITS <= len(r) <= MAX_DIGITS]
    pool = plausible or readings

    # Most common answer wins; ties break toward the mode listed first.
    counts = Counter(pool)
    best, agreement = counts.most_common(1)[0]

    # Independent segmentation modes landing on the same digits is a far better
    # trust signal than Tesseract's own confidence, which measurably collapses
    # to 0 whenever a "km" label shares the crop with a perfectly-read number.
    # The kiosk also checks the value against the vehicle's last odometer, which
    # is stronger still but isn't known at this vehicle-agnostic endpoint.
    confident = bool(plausible) and agreement >= 2
    return OdometerReading(reading=best, confident=confident)


def _read_digits(image: Image.Image, psm: int) -> str:
    """Digit run Tesseract sees in one page-segmentation mode, or "" for none."""
    config = f"--psm {psm} -c tessedit_char_whitelist=0123456789"
    data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
    digits = ""
    for text, conf in zip(data["text"], data["conf"]):
        text = text.strip()
        if not text or float(conf) < MIN_WORD_CONFIDENCE:  # tesseract uses -1 for non-text lines
            continue
        digits += "".join(ch for ch in text if ch.isdigit())
    return digits
