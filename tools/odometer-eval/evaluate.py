"""Score odometer OCR approaches against real photos.

Development tool, not part of the app. It exists because synthetic test images
badly misrepresented real dashboards: a rendered-text benchmark put PP-OCR at
27/28, and the first two real photos then exposed three failure modes it could
never have shown (drum separator bars read as "1", half-rolled digits, and
confident wrong answers). Anything that changes the OCR should be re-scored
here against real samples before it ships.

Usage:
    python tools/odometer-eval/evaluate.py .odo-samples/

Truth values come from the filename: any run of 4-7 digits immediately before
the extension, e.g. `hilux_night_653931.jpg` -> 653931. Files without one are
still processed, and reported as UNLABELLED so you can eyeball them.

Requires (dev only, not in requirements/base.txt):
    pip install onnxruntime opencv-python-headless
    npm install            # ships the models in @gutenye/ocr-models
"""

from __future__ import annotations

import argparse
import io
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fleetora.settings.dev")

import numpy as np  # noqa: E402
from PIL import Image, ImageEnhance  # noqa: E402

MODELS = REPO / "node_modules/@gutenye/ocr-models/assets"
DET_MODEL = MODELS / "ch_PP-OCRv4_det_infer.onnx"
REC_MODEL = MODELS / "ch_PP-OCRv4_rec_infer.onnx"
KEYS = MODELS / "ppocr_keys_v1.txt"

# Kept in step with packages/kiosk-core/src/lib/odometer-ocr.ts — if these
# drift, this harness stops measuring what actually ships.
REC_HEIGHT = 48
MIN_INPUT_WIDTH = 320
MAX_INPUT_WIDTH = 640
MIN_CHAR_PROB = 0.30

# An odometer is realistically 4-7 digits (fleet/services.py uses the same).
MIN_DIGITS, MAX_DIGITS = 4, 7

# Fraction of crop variants that must agree before a reading is trusted.
# Tuned on a small sample: prefer a retake over a wrong number.
MIN_VARIANT_AGREEMENT = 5 / 6

TRUTH_RE = re.compile(r"(\d{4,7})(?=\.[A-Za-z0-9]+$)")


@dataclass
class Reading:
    text: str | None
    confidence: float


def load_charset() -> tuple[list[str], dict[int, str]]:
    keys = KEYS.read_text(encoding="utf-8").split("\n")
    if keys and keys[-1] == "":
        keys = keys[:-1]
    charset = ["<blank>"] + keys + [" "]
    digits = {charset.index(d): d for d in "0123456789"}
    return charset, digits


class Engine:
    """PP-OCR detection + recognition, mirroring the on-device pipeline."""

    IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
    IMAGENET_STD = np.array([0.229, 0.224, 0.225], np.float32)

    def __init__(self) -> None:
        import onnxruntime as ort

        self.charset, self.digit_tokens = load_charset()
        self.det = ort.InferenceSession(str(DET_MODEL), providers=["CPUExecutionProvider"])
        self.rec = ort.InferenceSession(str(REC_MODEL), providers=["CPUExecutionProvider"])
        self.det_in = self.det.get_inputs()[0].name
        self.det_out = self.det.get_outputs()[0].name
        self.rec_in = self.rec.get_inputs()[0].name
        self.rec_out = self.rec.get_outputs()[0].name

    def recognise(self, crop: Image.Image, digits_only: bool = True) -> Reading:
        crop = crop.convert("RGB")
        if crop.width < 4 or crop.height < 4:
            return Reading(None, 0.0)
        width = min(
            MAX_INPUT_WIDTH,
            max(MIN_INPUT_WIDTH, round(crop.width * REC_HEIGHT / crop.height)),
        )
        arr = np.asarray(crop.resize((width, REC_HEIGHT), Image.BILINEAR)).astype(np.float32) / 255
        arr = ((arr - 0.5) / 0.5).transpose(2, 0, 1)[None]
        probs = self.rec.run([self.rec_out], {self.rec_in: arr})[0][0]

        out: list[str] = []
        confs: list[float] = []
        previous = -1
        for step in probs:
            if digits_only:
                index = max(self.digit_tokens, key=lambda i: step[i])
                prob = float(step[index])
                if prob < MIN_CHAR_PROB or step[0] > prob:
                    previous = 0
                    continue
                char = self.digit_tokens[index]
            else:
                index = int(np.argmax(step))
                prob = float(step[index])
                if index == 0:
                    previous = 0
                    continue
                char = self.charset[index]
            if index != previous:
                out.append(char)
                confs.append(prob)
            previous = index
        if not out:
            return Reading(None, 0.0)
        return Reading("".join(out), sum(confs) / len(confs))

    def detect(self, img: Image.Image, limit: int = 960) -> list[tuple[int, int, int, int, float]]:
        """Text-line boxes in original-image coordinates."""
        import cv2

        w0, h0 = img.size
        scale = limit / max(w0, h0)
        w = max(32, int(round(w0 * scale / 32)) * 32)
        h = max(32, int(round(h0 * scale / 32)) * 32)
        arr = np.asarray(img.convert("RGB").resize((w, h), Image.BILINEAR)).astype(np.float32) / 255
        arr = ((arr - self.IMAGENET_MEAN) / self.IMAGENET_STD).transpose(2, 0, 1)[None]
        prob = self.det.run([self.det_out], {self.det_in: arr})[0][0, 0]

        mask = (prob > 0.3).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        for contour in contours:
            if cv2.contourArea(contour) < 20:
                continue
            rect = cv2.minAreaRect(contour)
            poly = cv2.boxPoints(rect)
            scored = np.zeros(prob.shape, np.uint8)
            cv2.fillPoly(scored, [poly.astype(np.int32)], 1)
            if scored.sum() == 0:
                continue
            score = float(prob[scored == 1].mean())
            if score < 0.5:
                continue
            # PP-OCR "unclip": grow the box so glyph edges aren't shaved off.
            (cx, cy), (bw, bh), angle = rect
            grown = cv2.boxPoints(((cx, cy), (bw * 1.8, bh * 1.8), angle))
            x1 = max(0, grown[:, 0].min() / w * w0)
            x2 = min(w0, grown[:, 0].max() / w * w0)
            y1 = max(0, grown[:, 1].min() / h * h0)
            y2 = min(h0, grown[:, 1].max() / h * h0)
            if x2 - x1 < 8 or y2 - y1 < 8:
                continue
            boxes.append((int(x1), int(y1), int(x2), int(y2), score))
        return boxes

    def crop_variants(self, img: Image.Image, box: tuple[int, int, int, int]) -> list[Image.Image]:
        """Several readings of the same box, at different padding and contrast.

        Two measured reasons. The detector's boxes hug the glyphs, and one that
        shaved the digits turned a "1" into a "7" at 0.95 confidence — padding
        fixes that. And when the crop sits near a decision boundary the answer
        flips under small changes, so disagreement between variants is a usable
        signal that the read shouldn't be trusted.
        """
        x1, y1, x2, y2 = box
        w, h = x2 - x1, y2 - y1
        W, H = img.size
        out = []
        for pad_x, pad_y in ((0.02, 0.10), (0.04, 0.25), (0.06, 0.40)):
            crop = img.crop(
                (
                    max(0, int(x1 - w * pad_x)),
                    max(0, int(y1 - h * pad_y)),
                    min(W, int(x2 + w * pad_x)),
                    min(H, int(y2 + h * pad_y)),
                )
            )
            out.append(crop)
            out.append(ImageEnhance.Contrast(crop).enhance(2.0))
        return out

    def read_by_detection(self, img: Image.Image, last_odometer: int | None) -> tuple[Reading, list]:
        """Find every text line, then choose the one that looks like an odometer.

        Removes the dependency on where the operator aims: on a digital cluster
        it picked the odometer out of a QR sticker, a range readout and an
        outside-temperature readout.
        """
        from collections import Counter

        candidates: list[Reading] = []
        scored: list[tuple[int, float, int, int]] = []
        for x1, y1, x2, y2, _score in self.detect(img):
            values: list[int] = []
            confidences: dict[int, float] = {}
            for variant in self.crop_variants(img, (x1, y1, x2, y2)):
                reading = self.recognise(variant)
                if not reading.text or not MIN_DIGITS <= len(reading.text) <= MAX_DIGITS + 1:
                    continue
                # Compared as numbers, not strings: padding sometimes drags a
                # label edge into the crop and it decodes as a leading zero
                # ("0389775" for 389775), which is the same odometer value.
                value = int(reading.text)
                values.append(value)
                confidences[value] = max(confidences.get(value, 0.0), reading.confidence)
            if not values:
                continue
            best, agreement = Counter(values).most_common(1)[0]
            candidates.append(Reading(str(best), confidences[best]))
            scored.append((best, confidences[best], agreement, len(values)))

        plausible = [
            s
            for s in scored
            if MIN_DIGITS <= len(str(s[0])) <= MAX_DIGITS
            and (last_odometer is None or s[0] >= last_odometer)
        ]
        # Agreement first, confidence only as a tie-break: on one photo two
        # speedo dial numbers merged into an odometer-shaped "120140" that beat
        # nothing but scored 0.9958 against the true value's 0.9984.
        plausible.sort(key=lambda s: (-s[2], -s[1]))
        if not plausible:
            return Reading(None, 0.0), candidates
        value, confidence, agreement, total = plausible[0]
        if total and agreement / total < MIN_VARIANT_AGREEMENT:
            return Reading(None, 0.0), candidates
        return Reading(str(value), confidence), candidates


def tesseract_reading(img: Image.Image) -> Reading:
    import django

    django.setup()
    from fleet.services import extract_odometer_reading

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=92)
    result = extract_odometer_reading(buf.getvalue())
    return Reading(result.reading, 1.0 if result.confident else 0.0)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path, help="folder of odometer photos")
    parser.add_argument(
        "--last-odometer-margin",
        type=float,
        default=0.98,
        help="stand-in for the vehicle's last recorded reading, as a fraction "
        "of the truth (the kiosk knows the real one; this approximates it)",
    )
    parser.add_argument("--show-candidates", action="store_true", help="list every detected text line")
    args = parser.parse_args()

    images = sorted(
        p for p in args.folder.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".heic", ".webp"}
    )
    if not images:
        print(f"No images found in {args.folder}")
        return 1
    if not REC_MODEL.exists():
        print(f"Models missing at {MODELS} — run `npm install` first.")
        return 1

    engine = Engine()
    rows = []
    for path in images:
        match = TRUTH_RE.search(path.name)
        truth = match.group(1) if match else None
        img = Image.open(path)
        last_odo = int(int(truth) * args.last_odometer_margin) if truth else None

        detected, candidates = engine.read_by_detection(img, last_odo)
        tess = tesseract_reading(img)
        rows.append((path.name, truth, detected, tess, candidates))

    print(f"\n{'file':34} {'truth':9} {'detect+pick':12} {'conf':6} {'tesseract(full)':16}")
    print("-" * 88)
    labelled = det_ok = tess_ok = det_wrong = 0
    for name, truth, detected, tess, candidates in rows:
        got = detected.text or "(declined)"
        if truth:
            labelled += 1
            det_ok += detected.text == truth
            tess_ok += tess.text == truth
            det_wrong += bool(detected.text) and detected.text != truth
            mark = "OK" if detected.text == truth else ("WRONG" if detected.text else "declined")
        else:
            mark = "UNLABELLED"
        print(
            f"{name[:33]:34} {(truth or '?'):9} {got:12} "
            f"{detected.confidence:<6.2f} {(tess.text or '(none)'):16} {mark}"
        )
        if args.show_candidates:
            for c in sorted(candidates, key=lambda c: -c.confidence)[:8]:
                print(f"{'':34} candidate {c.text:10} conf={c.confidence:.2f}")

    if labelled:
        print(f"\nLabelled photos: {labelled}")
        print(f"  detection+pick correct : {det_ok}/{labelled}")
        print(f"  ...wrong (not declined): {det_wrong}   <- the number that matters most")
        print(f"  tesseract on full photo: {tess_ok}/{labelled}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
