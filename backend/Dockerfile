FROM python:3.11-slim

WORKDIR /app

# libpq-dev + gcc: needed to build psycopg (django-tenants' Postgres backend).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
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
