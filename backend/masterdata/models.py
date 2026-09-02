import uuid

from django.db import models


class MasterStatus(models.TextChoices):
    ACTIVE = "active"
    INACTIVE = "inactive"


class MasterRecord(models.Model):
    """
    Shared base for all 17 setup/master tables — mirrors the `MasterBase`
    interface every master type extends in the frontend's types, and the single
    generic CRUD factory (createMasterDataApi) the mock layer used.

    Note `code` is unique here, which the mock layer never enforced. It's unique
    *per tenant*, since each tenant has its own schema — two companies can both
    have a "VT-01".
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    status = models.CharField(max_length=10, choices=MasterStatus.choices, default=MasterStatus.ACTIVE)

    class Meta:
        abstract = True
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class VehicleTypeMaster(MasterRecord):
    description = models.TextField(blank=True, default="")


class VehicleMakeMaster(MasterRecord):
    country = models.CharField(max_length=60, blank=True, default="")
    description = models.TextField(blank=True, default="")


class VehicleModelMaster(MasterRecord):
    make = models.ForeignKey(VehicleMakeMaster, on_delete=models.PROTECT, related_name="models")
    vehicle_type = models.ForeignKey(VehicleTypeMaster, on_delete=models.PROTECT, related_name="models")
    year_from = models.PositiveIntegerField(null=True, blank=True)


class DepartmentMaster(MasterRecord):
    description = models.TextField(blank=True, default="")


class VehiclePurposeMaster(MasterRecord):
    class UseType(models.TextChoices):
        OFFICIAL = "Official"
        PERSONAL = "Personal"

    use_type = models.CharField(max_length=10, choices=UseType.choices)
    approval_level = models.CharField(max_length=60)


class MaintenanceServiceTypeMaster(MasterRecord):
    class Basis(models.TextChoices):
        MILEAGE = "Mileage"
        TIME = "Time"
        MILEAGE_TIME = "Mileage / Time"

    category = models.CharField(max_length=60)
    default_basis = models.CharField(max_length=20, choices=Basis.choices)


class EngineOilMaster(MasterRecord):
    class OilType(models.TextChoices):
        SYNTHETIC = "Synthetic"
        SEMI_SYNTHETIC = "Semi Synthetic"
        MINERAL = "Mineral"

    brand = models.CharField(max_length=60)
    grade = models.CharField(max_length=30)
    oil_type = models.CharField(max_length=20, choices=OilType.choices)
    pack_size = models.CharField(max_length=30)
    default_km = models.PositiveIntegerField()


class PartConsumableMaster(MasterRecord):
    category = models.CharField(max_length=60)
    unit = models.CharField(max_length=20)
    default_life_km = models.PositiveIntegerField(null=True, blank=True)


class WorkshopVendorMaster(MasterRecord):
    vendor_type = models.CharField(max_length=60)
    contact_person = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")


class CostCenterMaster(MasterRecord):
    department = models.ForeignKey(DepartmentMaster, on_delete=models.PROTECT, related_name="cost_centers")
    description = models.TextField(blank=True, default="")


class DrivingLicenceTypeMaster(MasterRecord):
    description = models.TextField(blank=True, default="")
    default_validity_years = models.PositiveSmallIntegerField(null=True, blank=True)


class FuelTypeMaster(MasterRecord):
    unit = models.CharField(max_length=20)
    description = models.TextField(blank=True, default="")


class GearOilTypeMaster(MasterRecord):
    description = models.TextField(blank=True, default="")


class TyreTypeMaster(MasterRecord):
    brand = models.CharField(max_length=60)
    size = models.CharField(max_length=40)
    type_pattern = models.CharField(max_length=40)
    ply_load = models.CharField(max_length=30, blank=True, default="")
    std_life_km = models.PositiveIntegerField(null=True, blank=True)


class DocumentTypeMaster(MasterRecord):
    category = models.CharField(max_length=60)
    default_alert_days = models.PositiveSmallIntegerField(null=True, blank=True)
    mandatory = models.BooleanField(default=False)


class LocationSiteMaster(MasterRecord):
    address = models.TextField(blank=True, default="")


class GateMaster(MasterRecord):
    location = models.ForeignKey(LocationSiteMaster, on_delete=models.PROTECT, related_name="gates")
    description = models.TextField(blank=True, default="")
