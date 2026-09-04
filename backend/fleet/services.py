import io
from dataclasses import dataclass

import pytesseract
from PIL import Image, ImageOps

# pytesseract reports word-level confidence on 0-100. Below this, a reading
# isn't trusted enough to auto-fill anything — the kiosk has no editable
# field downstream (see CaptureOdometerQrPage), only Confirm/Retake, so a
# shaky read must come back as "couldn't read it" rather than a guess.
CONFIDENCE_THRESHOLD = 65

# Guards a thin-RAM droplet against a huge decoded-image payload.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

# Tesseract's accuracy drops sharply on short text under ~200px tall.
MIN_IMAGE_HEIGHT = 200


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

    # PSM 7: treat the image as a single line of text — the right assumption
    # once the kiosk sends a tight crop of just the digit display.
    config = "--psm 7 -c tessedit_char_whitelist=0123456789"
    data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)

    digits = ""
    confidences = []
    for text, conf in zip(data["text"], data["conf"]):
        text = text.strip()
        if not text:
            continue
        conf = float(conf)
        if conf < 0:  # tesseract uses -1 for non-text lines
            continue
        digits += "".join(ch for ch in text if ch.isdigit())
        confidences.append(conf)

    if not digits or not confidences:
        return OdometerReading(reading=None, confident=False)

    avg_confidence = sum(confidences) / len(confidences)
    return OdometerReading(reading=digits, confident=avg_confidence >= CONFIDENCE_THRESHOLD)
