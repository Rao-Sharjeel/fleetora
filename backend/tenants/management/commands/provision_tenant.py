from django.core.management.base import BaseCommand, CommandError

from tenants.models import Domain, Tenant


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
        schema_name = options["schema_name"]
        if Tenant.objects.filter(schema_name=schema_name).exists():
            raise CommandError(f"Tenant with schema_name '{schema_name}' already exists.")

        tenant = Tenant.objects.create(schema_name=schema_name, name=options["name"])
        Domain.objects.create(domain=options["domain"], tenant=tenant, is_primary=True)

        self.stdout.write(self.style.SUCCESS(f"Created tenant '{tenant.name}' (schema: {schema_name})"))
        self.stdout.write(f"  Domain: {options['domain']}")
