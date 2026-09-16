"""
Adds the standard Vehicle Type / Make / Model reference data (see
_master_fixtures.py) into a real, already-in-use tenant's Master Setup.

Unlike seed_dev_data — which is built for a fresh demo schema and matches
purely by `code` — this is meant to run against a tenant that may already have
its own hand-entered makes and models. It matches by *name* first (case
insensitive) and skips anything that's already there under any code, so
running it against a tenant that already typed in "Toyota" doesn't create a
second "Toyota" row. A `code` collision with something unrelated (rare, but
possible if an admin picked one of our exact codes for something else) gets a
fresh suffixed code instead of failing outright.

Idempotent and safe to re-run. `--dry-run` shows what would change without
writing anything.

Usage:
    python manage.py seed_vehicle_reference_data --tenant <schema_name>
    python manage.py seed_vehicle_reference_data --tenant <schema_name> --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import schema_context

from common.management.commands import _master_fixtures as mf
from masterdata import models as md
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
                created_types = self._add_simple(md.VehicleTypeMaster, mf.VEHICLE_TYPES, dry_run)
                created_makes = self._add_simple(md.VehicleMakeMaster, mf.VEHICLE_MAKES, dry_run)
                created_models = self._add_models(mf.VEHICLE_MODELS, dry_run)
                if dry_run:
                    # Roll back — this transaction only exists so the dry run
                    # sees a consistent view of what already exists.
                    transaction.set_rollback(True)

        verb = "Would add" if dry_run else "Added"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {created_types} vehicle type(s), {created_makes} make(s), {created_models} model(s) "
            f"to '{schema_name}'."
        ))

    def _add_simple(self, model, rows, dry_run: bool) -> int:
        existing_names = {n.lower() for n in model.objects.values_list("name", flat=True)}
        existing_codes = set(model.objects.values_list("code", flat=True))
        created = 0
        for code, name, extra in rows:
            if name.lower() in existing_names:
                continue
            actual_code = self._free_code(code, existing_codes)
            self.stdout.write(f"  + {model.__name__}: {actual_code} {name}")
            if not dry_run:
                model.objects.create(code=actual_code, name=name, **extra)
            existing_codes.add(actual_code)
            existing_names.add(name.lower())
            created += 1
        return created

    def _add_models(self, rows, dry_run: bool) -> int:
        model = md.VehicleModelMaster
        existing_codes = set(model.objects.values_list("code", flat=True))
        # A model name alone isn't unique across makes ("Sportage" could exist
        # under two makes in theory), so match on (make, name) instead of name
        # alone.
        existing_pairs = {
            (m.make_id, m.name.lower()) for m in model.objects.select_related("make").all()
        }
        created = 0
        for code, name, make_code, type_code, year_from in rows:
            try:
                make = md.VehicleMakeMaster.objects.get(name__iexact=self._name_for_code(mf.VEHICLE_MAKES, make_code))
                vehicle_type = md.VehicleTypeMaster.objects.get(
                    name__iexact=self._name_for_code(mf.VEHICLE_TYPES, type_code)
                )
            except md.VehicleMakeMaster.DoesNotExist:
                # The make this model depends on wasn't added above (e.g. it
                # was skipped for some other reason) — skip the model too
                # rather than leave it pointing at nothing.
                continue
            if (make.id, name.lower()) in existing_pairs:
                continue
            actual_code = self._free_code(code, existing_codes)
            self.stdout.write(f"  + VehicleModelMaster: {actual_code} {make.name} {name}")
            if not dry_run:
                model.objects.create(code=actual_code, name=name, make=make, vehicle_type=vehicle_type, year_from=year_from)
            existing_codes.add(actual_code)
            existing_pairs.add((make.id, name.lower()))
            created += 1
        return created

    @staticmethod
    def _name_for_code(rows, code: str) -> str:
        return next(name for c, name, *_ in rows if c == code)

    @staticmethod
    def _free_code(code: str, taken: set[str]) -> str:
        """The exact code if it's free, otherwise a suffixed variant — codes
        are unique per tenant, and a tenant's own data may already hold one of
        our exact codes for something unrelated."""
        if code not in taken:
            return code
        n = 2
        while f"{code}-{n}" in taken:
            n += 1
        return f"{code}-{n}"
