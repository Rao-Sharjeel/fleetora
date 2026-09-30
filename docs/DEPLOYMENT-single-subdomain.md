> **This is not Fleetora's deployment doc.** It is a reference template for a
> *separate* project deployed to the same droplet, kept here because that
> project has no repo yet. Fleetora's own deployment lives in
> [`docker-compose.prod.yml`](../docker-compose.prod.yml) and
> [`.github/workflows/deploy-prod.yml`](../.github/workflows/deploy-prod.yml).
> Placeholders below (`<project>`, `app.yourdomain.com`, port numbers) still
> need filling in.

# Deployment

This project deploys to a DigitalOcean droplet shared with other projects,
using the same pattern as Fleetora: **Caddy on the host** terminates TLS and
reverse-proxies to Docker containers bound to `127.0.0.1`, and a GitHub Actions
workflow SSHes in on every push to `main` to rebuild them.

Unlike Fleetora — which gives each frontend its own subdomain and the API a
separate one — **this project serves the backend and the frontend from a single
subdomain**, split by path in Caddy. That makes browser requests same-origin,
so the project needs no CORS configuration at all.

```
                    app.yourdomain.com
                            │
                    ┌───────▼────────┐
                    │  Caddy (host)  │  TLS, :80/:443
                    └───┬────────┬───┘
         /api/*         │        │        everything else
         /admin/*       │        │
         /static/*      │        │
                  ┌─────▼──┐  ┌──▼──────┐
                  │backend │  │frontend │
                  │  :8093 │  │  :8094  │
                  └────┬───┘  └─────────┘
                       │
                  ┌────▼───┐
                  │   db   │  :5436
                  └────────┘
```

---

## Port allocation

Port collisions with the droplet's other projects are the main hazard, since
every project binds to the same loopback interface. Fleetora holds `5435`
(db), `8091` (backend) and `8092` (frontend).

Before the first deploy, confirm this project's block is free:

```bash
ss -ltnp | grep 127.0.0.1
```

| Service  | Host port | Container port |
|----------|-----------|----------------|
| db       | 5436      | 5432           |
| backend  | 8093      | 8000           |
| frontend | 8094      | 80             |

Backend and frontend still need separate ports even though they share a
subdomain — Caddy is what routes between them.

---

## DNS

One A record:

```
app.yourdomain.com  →  <droplet IP>
```

Caddy provisions and renews the TLS certificate automatically on first
request. No `api.` record is needed.

---

## Caddy

Append to `/etc/caddy/Caddyfile` on the droplet:

```caddy
app.yourdomain.com {
    encode gzip

    # Backend: everything the API owns. Note `handle`, not `handle_path` —
    # Django's URLconf expects the /api prefix to still be present.
    handle /api/* {
        reverse_proxy 127.0.0.1:8093
    }
    handle /admin/* {
        reverse_proxy 127.0.0.1:8093
    }
    handle /static/* {
        reverse_proxy 127.0.0.1:8093
    }

    # Everything else: the SPA
    handle {
        reverse_proxy 127.0.0.1:8094
    }
}
```

Validate before reloading. A broken Caddyfile takes down every site on the
droplet, not just this one:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## Django settings

`settings/prod.py`:

```python
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

# No CORS settings, and django-cors-headers is not installed: the frontend is
# served from this same origin, so there are no cross-origin requests to allow.

# Still required — Django checks the Origin header against this on unsafe methods.
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Load-bearing. Caddy terminates TLS and forwards plain HTTP to gunicorn, so
# without this request.is_secure() is always False and SECURE_SSL_REDIRECT
# 301-redirects every request to itself forever. Caddy's reverse_proxy sets
# X-Forwarded-Proto by default; no Caddyfile change needed.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Caddy routes /static/* here, so Django serves its own admin assets.
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # after SecurityMiddleware
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES["staticfiles"] = {
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
}
```

`requirements/prod.txt`:

```
-r base.txt
gunicorn==23.0.0
whitenoise==6.7.0
```

### backend/.env.production

Untracked, created by hand on the droplet, `chmod 600`:

```
DJANGO_SETTINGS_MODULE=<project>.settings.prod
DJANGO_SECRET_KEY=<50+ random characters>
DJANGO_ALLOWED_HOSTS=app.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://app.yourdomain.com
DB_NAME=<project>_db
DB_USER=<project>_user
DB_PASSWORD=<must match DB_PASSWORD in ../.env>
DB_HOST=db
DB_PORT=5432
```

`DB_HOST` is the Compose service name, not `localhost`, and `DB_PORT` is the
container's `5432` — the `5436` mapping exists only for host-side `psql`.

---

## Frontend

The API base URL is **relative**: `/api`. Because the browser resolves it
against whichever host served the page, the same built image works in staging
and production, and no absolute hostname is baked into the bundle.

`docker/frontend.Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_-prefixed vars from the environment at build time.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/frontend-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`docker/frontend-nginx.conf` — no `server_name` matching, since Caddy has
already decided this request belongs to the SPA:

```nginx
server {
    listen 80;
    default_server;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Hashed asset filenames are immutable, but index.html must never be
    # cached — a stale one points at asset files the new build deleted.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-store";
    }
}
```

---

## docker-compose.prod.yml

```yaml
# DB_PASSWORD is read from a .env file in this same directory (Compose loads
# that filename automatically) — never commit real values there.

services:

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: <project>_db
      POSTGRES_USER: <project>_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5436:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U <project>_user -d <project>_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      PYTHONUNBUFFERED: "1"
    depends_on:
      db:
        condition: service_healthy
    env_file: ./backend/.env.production
    ports:
      - "127.0.0.1:8093:8000"
    volumes:
      - ./media:/app/media
    # --workers 2 and --max-requests are deliberate: the droplet hosts more
    # than one project and has thin RAM margin, so workers are recycled
    # periodically to stop gunicorn RSS creeping until the OOM killer fires
    # and picks whichever process it likes.
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn <project>.wsgi:application --bind 0.0.0.0:8000 --workers 2
             --max-requests 500 --max-requests-jitter 50
             --capture-output --enable-stdio-inheritance
             --access-logfile - --error-logfile - --log-level info"

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:8094:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## First deploy

```bash
ssh <user>@<droplet>

sudo mkdir -p /srv/<project>-production
sudo chown "$USER" /srv/<project>-production
git clone <repo-url> /srv/<project>-production
cd /srv/<project>-production

printf 'DB_PASSWORD=%s\n' "$(openssl rand -base64 24)" > .env
chmod 600 .env

# Create backend/.env.production (see above) using that same DB_PASSWORD.
chmod 600 backend/.env.production

docker compose -p <project>-production -f docker-compose.prod.yml up -d --build
docker compose -p <project>-production -f docker-compose.prod.yml logs -f backend
```

The `-p <project>-production` project name keeps container and volume names
from colliding with the droplet's other projects. It is required on **every**
Compose command, not just the first.

Once the backend is healthy, add the Caddy block, reload Caddy, then:

```bash
docker compose -p <project>-production -f docker-compose.prod.yml \
  exec backend python manage.py createsuperuser
```

---

## Continuous deployment

`.github/workflows/deploy-prod.yml`. Requires repository secrets `DO_HOST`,
`DO_USERNAME` and `DO_SSH_KEY` — the same values the Fleetora repo uses.

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  check-migrations:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: ci
          POSTGRES_USER: ci
          POSTGRES_PASSWORD: ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements/prod.txt
      - name: Check for missing migrations
        working-directory: backend
        run: python manage.py makemigrations --check --dry-run
        env:
          DJANGO_SETTINGS_MODULE: <project>.settings.dev
          DJANGO_SECRET_KEY: ci-check-only
          DB_NAME: ci
          DB_HOST: localhost
          DB_USER: ci
          DB_PASSWORD: ci
          DB_PORT: '5432'

  deploy:
    runs-on: ubuntu-latest
    needs: [check-migrations]
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USERNAME }}
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            # `set -e` is load-bearing: without it a failed image build is
            # followed by `docker image prune -f`, which succeeds, and the
            # script's exit code comes from that last command. A deploy whose
            # build failed outright then reports green while the old
            # containers keep serving.
            set -euo pipefail
            cd /srv/<project>-production
            git pull origin main
            docker compose -p <project>-production -f docker-compose.prod.yml up -d --build
            docker image prune -f
```

---

## Verifying a deploy

```bash
curl -I https://app.yourdomain.com/             # SPA          → 200
curl -I https://app.yourdomain.com/api/health/  # backend      → 200
curl -I http://app.yourdomain.com/              # redirect     → 308
```

The middle check is the one that matters. If `/api/` returns the SPA's HTML,
the Caddy `handle` blocks are being shadowed — within a site block Caddy
orders `handle` by specificity, but a bare `reverse_proxy` placed *outside* a
`handle` swallows every request.

---

## Operations

```bash
cd /srv/<project>-production
C="docker compose -p <project>-production -f docker-compose.prod.yml"

$C ps
$C logs -f backend
$C restart backend
$C exec backend python manage.py shell
$C exec db psql -U <project>_user -d <project>_db
```

### Database backup

```bash
docker compose -p <project>-production -f docker-compose.prod.yml \
  exec -T db pg_dump -U <project>_user <project>_db | gzip \
  > "/srv/backups/<project>-$(date +%F).sql.gz"
```

### Disk

`docker image prune -f` in the deploy script only removes dangling images.
With several projects rebuilding on every push, the droplet fills faster than
expected, and the symptom is a build failing with no space left. A weekly cron
covers it:

```bash
0 4 * * 0 docker system prune -af --filter "until=168h"
```

### A note on running a second Postgres

This compose file starts a Postgres container of its own, which means two sets
of `shared_buffers` and two sets of background workers on one droplet. On a
2 GB box, consider instead creating a database and role inside the existing
Fleetora Postgres container and pointing `DB_HOST`/`DB_PORT` at it — one fewer
process, one fewer port, and one backup routine. The trade-off is that the two
projects then share a failure domain and a restart.
