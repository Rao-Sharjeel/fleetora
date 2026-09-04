from django.core.management.base import BaseCommand

from tenants.models import Domain, Tenant

PUBLIC_DOMAIN = "app.localhost"


class Command(BaseCommand):
    """
    Creates the Tenant row for the public schema itself (schema_name="public")
    plus a Domain pointing at it — the *one* login domain for the whole
    platform now (every tenant's users and the Super Admin API alike; user-based
    multi-tenancy resolves the actual tenant from the logged-in user's own
    `tenant` FK once authenticated, not from hostname — see
    accounts.authentication.TenantAwareJWTAuthentication). Idempotent — safe to
    run more than once (e.g. on every deploy).

    Tenant.save() only creates a Postgres schema if one doesn't already exist
    (see django_tenants.models.TenantMixin.create_schema's check_if_exists=True) —
    "public" already exists, so this never touches it, just adds the row.
    """

    help = "Idempotently creates the public-schema Tenant + the platform's one shared login Domain."

    def add_arguments(self, parser):
        parser.add_argument(
            "--domain",
            default=PUBLIC_DOMAIN,
            help=f"Hostname to route to the public schema (default: {PUBLIC_DOMAIN}).",
        )

    def handle(self, *args, **options):
        tenant, created = Tenant.objects.get_or_create(
            schema_name="public", defaults={"name": "Fleetora Platform"}
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created public Tenant row."))
        else:
            self.stdout.write("Public Tenant row already exists.")

        domain = options["domain"]
        _, created = Domain.objects.get_or_create(domain=domain, defaults={"tenant": tenant, "is_primary": True})
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Domain '{domain}' -> public schema."))
        else:
            self.stdout.write(f"Domain '{domain}' already exists.")
