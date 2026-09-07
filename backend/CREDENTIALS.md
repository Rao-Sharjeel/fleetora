# Credentials & Keys

Every secret the backend needs, where it lives, how it's used, and how to
rotate it. All of these are read from `backend/.env` (gitignored — see
`.env.example` for the template) via `django-environ` in
`fleetora/settings/base.py`. **Never commit real values** — `.env` is
git-ignored specifically so this file can safely describe them.

---

## 1. `DJANGO_SECRET_KEY`

**What it is**: Django's general-purpose cryptographic signing key.

**Used for**:
- Signing session cookies and CSRF tokens.
- Signing JWT access/refresh tokens (`djangorestframework-simplejwt` falls
  back to `SECRET_KEY` because `SIMPLE_JWT` in `fleetora/settings/base.py`
  doesn't set its own `SIGNING_KEY`) — so this key is what actually backs
  every login session across the admin app and kiosks.

**How to update**: generate a new one and set it in `.env`:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**When to rotate**: if it ever leaks (committed by accident, logged, exposed
in an error page). Rotating it **immediately invalidates every existing
session and JWT** — every logged-in user and kiosk device session gets
signed out and has to log in again. Not something to rotate casually.

---

## 2. Database credentials (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)

**What it is**: Postgres connection details, read into `DATABASES["default"]`
in `fleetora/settings/base.py`. This is the one Postgres instance that holds
every tenant's schema (schema-per-tenant via `django-tenants`), plus the
shared `public` schema (`accounts.User`, `tenants.Tenant`, etc.).

**Used for**: every database read/write the API makes, across all tenants.

**How to update**: change the Postgres role's password (`ALTER ROLE fleetora
WITH PASSWORD '...'`), then update `DB_PASSWORD` in `.env` on every machine/
server that runs the API.

**When to rotate**: on a schedule per your infra policy, when someone with
DB access leaves, or immediately if the `.env` file or a backup containing it
is ever exposed. Rotating requires restarting the API process afterward
(connections are re-established on next request, but a stale password will
error until the deploy picks up the new value).

---

## 3. Backblaze B2 (`B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_REGION_NAME`, `B2_ENDPOINT_URL`)

**What it is**: an S3-compatible Application Key for the `drive-media` B2
bucket, consumed by `django-storages`' `S3Boto3Storage` (configured as
`STORAGES["default"]` in `fleetora/settings/base.py`).

**Used for**: every `ImageField`/`FileField` upload in the app — currently
`Driver.photo` and `Guard.photo` (`fleet/models.py`). Files are written to
`drivers/<tenant-schema>/<id>/<filename>` and `guards/<tenant-schema>/<id>/<filename>`
inside the bucket, keeping tenants' files apart even though the bucket itself
is shared. The bucket is **private** with no per-object ACLs (B2 doesn't
support them), so every URL the API hands out (`photo_url` in
`DriverSerializer`/`GuardSerializer`) is a **presigned URL**, valid for
`AWS_QUERYSTRING_EXPIRE` (currently 3600 seconds / 1 hour) — after that, the
link expires and the frontend must re-fetch the record to get a fresh one.

**How to get/update**: Backblaze web console → **Application Keys** (not the
main account page, which shows a different "Account ID + Master Application
Key" pair that looks similar but is NOT S3-compatible and won't work here) →
Add a New Application Key → restrict "Allow Access to Bucket(s)" to
`drive-media` → Read and Write access. The `applicationKey` secret is shown
**once** at creation — copy both `keyID` and `applicationKey` into `.env`
immediately (`B2_KEY_ID`, `B2_APPLICATION_KEY`).

A correctly-scoped key's `keyID` is a long alphanumeric string (e.g.
`003xxxxxxxxxxxxxxxxxxxxxxxx`), not a short plain-hex string — a short hex
`keyID` paired with a long hex secret means you accidentally grabbed the
account's Master Key pair instead of an Application Key.

**When to rotate**:
- The old key stops working — go create a new scoped key (steps above) and
  update `.env`; the old key can then be deleted from the B2 console.
- Immediately, if the key/secret is ever exposed (pasted somewhere public,
  committed, logged) — delete the compromised key in the B2 console and
  issue a new one. Old presigned URLs generated with a deleted key stop
  working immediately.
- No fixed schedule otherwise; this key only has read/write/list/delete
  access to the single `drive-media` bucket (least-privilege by design), so
  the blast radius of a leak is limited to that bucket's contents.

---

## 4. Kiosk device API keys (`KioskDevice.api_key`)

**What it is**: *not* an environment variable — this one is different from
everything above. Each physical gate kiosk (Exit/Entry/Fuel) gets its own
64-character key, auto-generated (`accounts/models.py`'s `generate_kiosk_key`,
via `secrets.token_hex(32)`) and stored per-row in the `KioskDevice` table
(one row per device, per tenant).

**Used for**: kiosk authentication. A kiosk sends it in the
`X-Kiosk-Api-Key` header on every request; `KioskDeviceAuthentication`
(`accounts/authentication.py`) looks up the matching active `KioskDevice` and
authenticates as that device rather than as a logged-in user — this is how
Exit/Entry/Fuel record driver/guard/trip data without a human login.

**How to get one**: created automatically when a `KioskDevice` row is made —
either via `python manage.py seed_dev_data --tenant <schema>` (prints the key
to stdout for local dev) or by creating a `KioskDevice` through the admin
app / Django admin for a real deployment. Whoever configures a physical
kiosk needs to copy this value into that device's local config.

**How to update**: there's **no rotate/regenerate endpoint** by design
(`accounts/serializers.py`) — the field is `editable=False`. To "rotate" a
device's key in practice: deactivate the old `KioskDevice` row
(`active=False`, which immediately blocks it — `KioskDeviceAuthentication`
filters on `active=True`) and create a new one, then reconfigure the
physical kiosk with the new key.

**When to rotate**: if a kiosk device is lost, stolen, or decommissioned —
deactivate its row immediately. Otherwise these don't need scheduled
rotation; each key only authenticates as that one device, scoped to that
device's tenant.

---

## Adding a new secret

1. Add it to `backend/.env` (real value) and `backend/.env.example`
   (placeholder, e.g. `change-me`).
2. Read it in `fleetora/settings/base.py` (or `dev.py`/`prod.py` if it's
   environment-specific) via `env("YOUR_VAR", default=...)`.
3. Document it here: what it is, where it's used, how to update it, and when
   it needs rotating.
