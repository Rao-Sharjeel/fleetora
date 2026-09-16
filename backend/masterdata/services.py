"""
Shared logic for bringing the standard vehicle reference data (types, makes,
models — see common/management/commands/_master_fixtures.py) into whatever
tenant schema is currently active.

Used by both the `seed_vehicle_reference_data` management command (which
switches schema itself via schema_context) and the admin-only API endpoint
that backs the "Add Standard Vehicle Data" button on the Master Setup screen
(where the schema is already switched by request-time tenant auth) — one
implementation, so the button and the command can never drift apart.

Idempotent by construction: matches by name (case-insensitive), not code, so
running it against a tenant that already typed in "Toyota" under some other
code doesn't create a second "Toyota" row, and clicking the button twice adds
nothing the second time.
"""

from dataclasses import dataclass, field

from common.management.commands import _master_fixtures as mf
from masterdata import models as md


@dataclass
class ReferenceDataResult:
    types_added: list[str] = field(default_factory=list)
    makes_added: list[str] = field(default_factory=list)
    models_added: list[str] = field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.types_added) + len(self.makes_added) + len(self.models_added)


def _free_code(code: str, taken: set[str]) -> str:
    """The exact code if it's free, otherwise a suffixed variant — codes are
    unique per tenant, and a tenant's own data may already hold one of our
    exact codes for something unrelated."""
    if code not in taken:
        return code
    n = 2
    while f"{code}-{n}" in taken:
        n += 1
    return f"{code}-{n}"


def _name_for_code(rows, code: str) -> str:
    return next(name for c, name, *_ in rows if c == code)


def _add_simple(model, rows, dry_run: bool) -> list[str]:
    existing_names = {n.lower() for n in model.objects.values_list("name", flat=True)}
    existing_codes = set(model.objects.values_list("code", flat=True))
    added = []
    for code, name, extra in rows:
        if name.lower() in existing_names:
            continue
        actual_code = _free_code(code, existing_codes)
        if not dry_run:
            model.objects.create(code=actual_code, name=name, **extra)
        existing_codes.add(actual_code)
        existing_names.add(name.lower())
        added.append(name)
    return added


def _add_models(dry_run: bool) -> list[str]:
    model = md.VehicleModelMaster
    existing_codes = set(model.objects.values_list("code", flat=True))
    # A model name alone isn't unique across makes, so match on (make, name).
    existing_pairs = {(m.make_id, m.name.lower()) for m in model.objects.select_related("make").all()}
    added = []
    for code, name, make_code, type_code, year_from in mf.VEHICLE_MODELS:
        try:
            make = md.VehicleMakeMaster.objects.get(name__iexact=_name_for_code(mf.VEHICLE_MAKES, make_code))
            vehicle_type = md.VehicleTypeMaster.objects.get(name__iexact=_name_for_code(mf.VEHICLE_TYPES, type_code))
        except md.VehicleMakeMaster.DoesNotExist:
            # The make this model depends on wasn't added (e.g. it was already
            # present under a name mf doesn't expect) — skip rather than
            # leave the model pointing at nothing.
            continue
        if (make.id, name.lower()) in existing_pairs:
            continue
        actual_code = _free_code(code, existing_codes)
        if not dry_run:
            model.objects.create(code=actual_code, name=name, make=make, vehicle_type=vehicle_type, year_from=year_from)
        existing_codes.add(actual_code)
        existing_pairs.add((make.id, name.lower()))
        added.append(f"{make.name} {name}")
    return added


def add_vehicle_reference_data(dry_run: bool = False) -> ReferenceDataResult:
    """Adds any of the standard vehicle types/makes/models not already present
    (by name) in the current schema. Safe to call repeatedly — a second call
    with nothing new to add returns an empty result."""
    result = ReferenceDataResult()
    result.types_added = _add_simple(md.VehicleTypeMaster, mf.VEHICLE_TYPES, dry_run)
    result.makes_added = _add_simple(md.VehicleMakeMaster, mf.VEHICLE_MAKES, dry_run)
    result.models_added = _add_models(dry_run)
    return result
