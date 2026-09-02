from django.core.management.base import BaseCommand, CommandError

from tenants.services import TenantAlreadyExists, provision_tenant


class Command(BaseCommand):
    # Named provision_tenant, not create_tenant — django_tenants itself ships a
    # built-in "create_tenant" command with a different argument style that
    # would otherwise shadow this one.
    help = "Provision a new tenant: creates its schema (auto-migrated) and a Domain pointing at it."

    def add_arguments(self, parser):
        parser.add_argument("schema_name", help="Postgres schema name, e.g. 'acme'")
        parser.add_argument("name", help="Display name, e.g. 'Acme Corp'")
        parser.add_argument("domain", help="API hostname for this tenant, e.g. 'acme.api.fleetora.com'")

    def handle(self, *args, **options):
        try:
            tenant = provision_tenant(options["schema_name"], options["name"], options["domain"])
        except TenantAlreadyExists as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(f"Created tenant '{tenant.name}' (schema: {tenant.schema_name})"))
        self.stdout.write(f"  Domain: {options['domain']}")
