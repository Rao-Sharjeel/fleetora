# Fleetora

Multi-tenant fleet management: one Django API plus four independently-built,
independently-deployed frontends.

## Layout

```
backend/              Django + DRF API (multi-tenant, schema-per-tenant)
apps/
  admin/              Full management console      → admin.fleetora.com
  exit/               Gate exit kiosk    (PWA)     → exit.fleetora.com
  entry/              Gate entry kiosk   (PWA)     → entry.fleetora.com
  fuel/               Fuel logging kiosk (PWA)     → fuel.fleetora.com
packages/
  kiosk-core/         Shared kiosk code: camera, QR decode, OCR, API client,
                      shell chrome, and the ID-scan / person-identified screens
Fleetora/             Design references, spec PDFs, sample QR assets
```

Each app in `apps/` is a separate npm workspace with its own `package.json`,
Vite config, PWA manifest, and icons — so they build, version and deploy
independently, and each installs to a phone home screen as its own app.

## Tenancy

The **tenant** is the customer company, and each gets its own Postgres schema.
Tenants are resolved from the API hostname, which is deliberately kept separate
from the frontend subdomains above:

```
demo.api.fleetora.com   → schema "demo"
acme.api.fleetora.com   → schema "acme"
```

All four of a tenant's frontends point `VITE_API_BASE_URL` at that tenant's API
host. Users, kiosk devices and every business record live inside the tenant
schema, so cross-tenant access fails at the database level, not via a filter
someone could forget.

## Running locally

```bash
npm install

# Frontends (ports are pinned; each is its own app)
npm run dev:admin     # 5173
npm run dev:exit      # 5174
npm run dev:entry     # 5175
npm run dev:fuel      # 5176

# Backend
cd backend
source .venv/bin/activate
python manage.py runserver 8000
```

Postgres for local dev runs on **port 5433** (isolated from any other local
Postgres) with data in `~/fleetora-pgdata`:

```bash
pg_ctl -D ~/fleetora-pgdata -o "-p 5433" -l ~/fleetora-pgdata/server.log start
```

Tenant hosts resolve locally via `curl --resolve` or `/etc/hosts` entries such
as `demo.api.localhost`.

### Useful backend commands

```bash
python manage.py provision_tenant acme "Acme Corp" acme.api.localhost
python manage.py seed_dev_data --tenant demo     # demo fixtures + kiosk API key
python manage.py migrate_schemas                  # migrate public + all tenants
```

## Building

```bash
npm run build            # all four apps
npm run build:exit       # or one at a time
```

Each app emits to its own `apps/<name>/dist/`, ready to deploy to its subdomain.

## Current state

The kiosks currently talk to the admin app's temporary postMessage bridge
(mock data). The Django API is built and tested but not yet wired to the
frontends — that swap replaces `packages/kiosk-core/src/lib/bridge-client.ts`
with direct HTTP calls and deletes the bridge.
