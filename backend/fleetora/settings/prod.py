from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Caddy terminates TLS and forwards plain HTTP to gunicorn — without this,
# request.is_secure() is always False behind that proxy, and SECURE_SSL_REDIRECT
# above 301-redirects every request to itself forever. Caddy's reverse_proxy
# sets X-Forwarded-Proto by default, no Caddyfile change needed.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
