from corsheaders.defaults import default_headers

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Admin (5173) and the three kiosk apps — Exit (5174), Entry (5175), Fuel (5176) — which
# now call this API directly (see accounts.authentication.KioskDeviceAuthentication)
# instead of going through admin's postMessage bridge.
# Tenant subdomains are simulated locally via /etc/hosts entries, e.g. "demo.api.localhost".
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
    ],
)
CORS_ALLOW_CREDENTIALS = True
# The kiosk apps authenticate via this custom header — not in corsheaders' default list.
CORS_ALLOW_HEADERS = [*default_headers, "x-kiosk-api-key"]
