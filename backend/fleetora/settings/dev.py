from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Main app (5173) and the Exit kiosk (5174, confirmed against apps/kiosk-exit/vite.config.ts).
# Tenant subdomains are simulated locally via /etc/hosts entries, e.g. "demo.api.localhost".
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:5174"],
)
CORS_ALLOW_CREDENTIALS = True
