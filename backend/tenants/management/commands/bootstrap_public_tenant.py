from django.core.management.base import BaseCommand

from tenants.models import Domain, Tenant

PUBLIC_DOMAIN = "platform.localhost"


class Command(BaseCommand):
    """
    Creates the Tenant row for the public schema itself (schema_name="public")
    plus a Domain pointing at it, so requests to that domain resolve to the
    public schema and get PUBLIC_SCHEMA_URLCONF (the Super Admin API) instead
    of a 404. Idempotent — safe to run more than once (e.g. on every deploy).

    Tenant.save() only creates a Postgres schema if one doesn't already exist
    (see django_tenants.models.TenantMixin.create_schema's check_if_exists=True) —
    "public" already exists, so this never touches it, just adds the row.
    """

    help = "Idempotently creates the public-schema Tenant + Domain the Super Admin API needs."

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
