# Odometer OCR evaluation

Scores odometer reading approaches against **real photos**. Development tool —
not imported by the app or the backend.

## Why this exists

Synthetic test images badly misrepresented real dashboards. A benchmark built
from rendered text put PP-OCR at 27/28 and suggested the problem was solved.
The first two real photos then showed three failure modes that benchmark could
never produce:

- **Drum separator bars read as `1`.** Mechanical odometers have bright vertical
  bars between digit drums; widen the crop and `653931` comes back as
  `161513191314`.
- **Half-rolled digits.** A drum caught mid-roll is genuinely ambiguous — the
  model read the last digit as `7`, the true value was `1`. Losing the last
  digit of an odometer is a 10x error.
- **Confident wrong answers.** A crop that missed the odometer returned `20` at
  0.73 confidence, and a 5-of-6-digit misread scored 0.97. Confidence alone is
  not a safe gate; synthetic images never showed this.

So: re-score here against real samples before changing anything about the OCR.

## Setup

```bash
npm install            # ships the models in @gutenye/ocr-models
backend/.venv/bin/pip install onnxruntime opencv-python-headless
```

These two Python packages are deliberately **not** in `backend/requirements/`.
The production OCR path is Tesseract; nothing the server runs needs onnxruntime.

## Usage

```bash
backend/.venv/bin/python tools/odometer-eval/evaluate.py .odo-samples/
backend/.venv/bin/python tools/odometer-eval/evaluate.py .odo-samples/ --show-candidates
```

Put photos in `.odo-samples/` (gitignored — dashboard photos can identify a
vehicle). Encode the true reading in the filename as the last 4–7 digit run
before the extension:

```
hilux_night_glare_653931.jpg   ->  truth 653931
```

Unlabelled files still run, reported as `UNLABELLED`, so you can eyeball them.

## Reading the output

`...wrong (not declined)` is the number that matters most. A declined read
costs the guard a retake; a **wrong** read silently corrupts the odometer log
and every fuel-efficiency and service-interval figure derived from it. Prefer
an approach that declines over one with a better raw hit rate.

The `detect+pick` column is the detection-based pipeline: find every text line,
recognise each, then keep candidates that are 4–7 digits and at least the
vehicle's last recorded reading. That last filter is what makes it safe — it is
what rejected the `65393` misread — and it is why the kiosk needs to send the
vehicle's previous odometer, which the current vehicle-agnostic endpoint does
not receive.
