FROM python:3.11-slim

WORKDIR /app

# libpq-dev + gcc: needed to build psycopg (django-tenants' Postgres backend).
# tesseract-ocr: the actual OCR engine binary — pytesseract only wraps its CLI.
# Deliberately not a deep-learning-framework-based OCR (PaddleOCR/docTR/etc.) —
# those load a full neural-net runtime into memory per worker, and this droplet
# has thin RAM margin (see the gunicorn CMD below).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

COPY . .

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# --max-requests: recycles workers periodically so long-running Python
# processes never accumulate unbounded RSS — this droplet has thin RAM margin.
CMD ["gunicorn", "fleetora.wsgi:application", "--bind", "0.0.0.0:8000", \
     "--workers", "2", "--max-requests", "500", "--max-requests-jitter", "50", \
     "--capture-output", "--enable-stdio-inheritance", \
     "--access-logfile", "-", "--error-logfile", "-", "--log-level", "info"]
