"""
Adds the standard Vehicle Type / Make / Model reference data (see
_master_fixtures.py) into a real, already-in-use tenant's Master Setup.

The matching/idempotency logic lives in masterdata.services — shared with the
"Add Standard Vehicle Data" button on the Master Setup screen, so a change to
what counts as "already there" only has to happen in one place. This command
exists for reaching a tenant from the shell (SSH) rather than through the UI —
useful before anyone's logged in, or for scripting several tenants at once.

Idempotent and safe to re-run. `--dry-run` shows what would change without
writing anything.

Usage:
    python manage.py seed_vehicle_reference_data --tenant <schema_name>
    python manage.py seed_vehicle_reference_data --tenant <schema_name> --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import schema_context

from masterdata.services import add_vehicle_reference_data
from tenants.models import Tenant


class Command(BaseCommand):
    help = "Adds the standard vehicle type/make/model reference data into one tenant's Master Setup, without touching what's already there."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant schema_name to add reference data into")
        parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing anything")

    def handle(self, *args, **options):
        schema_name = options["tenant"]
        dry_run = options["dry_run"]
        try:
            tenant = Tenant.objects.get(schema_name=schema_name)
        except Tenant.DoesNotExist:
            raise CommandError(f"No tenant with schema_name '{schema_name}'.")

        with schema_context(tenant.schema_name):
            with transaction.atomic():
                result = add_vehicle_reference_data(dry_run=dry_run)
                if dry_run:
                    # Roll back — this transaction only exists so the dry run
                    # sees a consistent view of what already exists.
                    transaction.set_rollback(True)

        for name in result.types_added:
            self.stdout.write(f"  + Vehicle Type: {name}")
        for name in result.makes_added:
            self.stdout.write(f"  + Vehicle Make: {name}")
        for name in result.models_added:
            self.stdout.write(f"  + Vehicle Model: {name}")

        verb = "Would add" if dry_run else "Added"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {len(result.types_added)} vehicle type(s), {len(result.makes_added)} make(s), "
            f"{len(result.models_added)} model(s) to '{schema_name}'."
        ))
