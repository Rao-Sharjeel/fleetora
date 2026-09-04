"""
Environment-agnostic settings — everything that doesn't change between dev and prod.
See dev.py / prod.py for the environment-specific overrides.
"""

from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-only-change-me")

# --- django-tenants: schema-per-tenant multi-tenancy -----------------------
# SHARED_APPS live in the public schema (shared across every tenant).
# TENANT_APPS get one fully separate copy of their tables per tenant schema.
#
# accounts (User, KioskDevice) lives in SHARED_APPS, not TENANT_APPS: identity
# is a single platform-wide table with a `tenant` FK column (user-based
# multi-tenancy — one login domain, the user's own row says which tenant they
# belong to), not one separate copy per schema. django.contrib.auth/admin/sessions
# come along with it: accounts.User inherits groups/user_permissions M2M fields
# from AbstractUser, whose through-tables FK into auth_group/auth_permission —
# those must exist in the same (public) schema or the migration fails outright.
#
# Everything else (fleet, maintenance, documents, ...) stays a TENANT_APP —
# that's where the isolation guarantee actually matters (a company's vehicles,
# trips, fuel history), and schema separation keeps protecting it exactly as
# before. Losing schema-level isolation only applies to accounts' own models;
# see accounts/views.py's tenant-filtered querysets for how that's enforced instead.
SHARED_APPS = [
    "django_tenants",
    "tenants",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.admin",
    "django.contrib.sessions",
    "accounts",
]

TENANT_APPS = [
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "fleet",
    "maintenance",
    "documents",
    "requisitions",
    "alerts",
    "audit",
    "masterdata",
    "common",
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "tenants.Tenant"
TENANT_DOMAIN_MODEL = "tenants.Domain"
PUBLIC_SCHEMA_NAME = "public"
# No PUBLIC_SCHEMA_URLCONF: with user-based multi-tenancy there's exactly one
# login domain for everyone (see bootstrap_public_tenant), always resolving to
# the public schema — so there's nothing left for a *second* urlconf to
# differentiate. Every route lives in ROOT_URLCONF (fleetora.urls); which ones
# are super-admin-only vs. tenant-user-only is enforced by each view's own
# authentication/permission classes instead (see tenants.permissions.IsSuperAdmin).

DATABASE_ROUTERS = ["django_tenants.routers.TenantSyncRouter"]

MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "fleetora.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "fleetora.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": env("DB_NAME", default="fleetora"),
        "USER": env("DB_USER", default="fleetora"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5433"),
    }
}

# Both dev and prod need this — the kiosk apps authenticate via this custom
# header, which isn't in corsheaders' default allow-list. Lives here (not just
# dev.py) so prod.py inherits it automatically instead of needing its own copy.
CORS_ALLOW_HEADERS = [*default_headers, "x-kiosk-api-key"]

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.TenantAwareJWTAuthentication",
        "accounts.authentication.KioskDeviceAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DATETIME_FORMAT": "iso-8601",
    # Unbounded list endpoints are fine against seed data and a liability against
    # a real fleet's trip/fuel history.
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    # DRF's default renders DecimalFields as JSON strings ("18500.00"). Every TS
    # interface types these as `number` (FuelEntry.litres/ratePerLitre/total,
    # MaintenanceRecord.totalCost, ...) and does real arithmetic on them client-side
    # (vehicleFuelStats, dashboard/report aggregation) — a string there silently
    # turns `sum + entry.total` into string concatenation, not addition.
    "COERCE_DECIMAL_TO_STRING": False,
    # Serializers stay Pythonic snake_case; the JSON wire format is camelCase,
    # matching every TS interface in src/types/index.ts field-for-field.
    "DEFAULT_RENDERER_CLASSES": [
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
    ],
}
JSON_CAMEL_CASE = {"REPLACE_INPUT_KEY_WITH_ERROR_KEY": True}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}
