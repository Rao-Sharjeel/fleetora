from rest_framework import serializers

from masterdata import models as m

BASE_FIELDS = ["id", "code", "name", "status"]


def master_serializer(model_class, extra_fields: list[str], declared: dict | None = None):
    """
    All 17 master tables are "code/name/status plus a few extras", so their
    serializers are generated from one template rather than hand-written 17 times.
    `declared` carries explicitly-named fields (the FK ones, which must serialize
    as `<name>Id` to match the frontend's types).
    """
    meta = type("Meta", (), {"model": model_class, "fields": BASE_FIELDS + extra_fields, "read_only_fields": ["id"]})
    return type(
        f"{model_class.__name__}Serializer",
        (serializers.ModelSerializer,),
        {"Meta": meta, **(declared or {})},
    )


VehicleTypeSerializer = master_serializer(m.VehicleTypeMaster, ["description"])
VehicleMakeSerializer = master_serializer(m.VehicleMakeMaster, ["country", "description"])
VehicleModelSerializer = master_serializer(
    m.VehicleModelMaster,
    ["make_id", "vehicle_type_id", "year_from"],
    {
        "make_id": serializers.PrimaryKeyRelatedField(
            source="make", queryset=m.VehicleMakeMaster.objects.all()
        ),
        "vehicle_type_id": serializers.PrimaryKeyRelatedField(
            source="vehicle_type", queryset=m.VehicleTypeMaster.objects.all()
        ),
    },
)
DepartmentSerializer = master_serializer(m.DepartmentMaster, ["description"])
VehiclePurposeSerializer = master_serializer(m.VehiclePurposeMaster, ["use_type", "approval_level"])
MaintenanceServiceTypeSerializer = master_serializer(
    m.MaintenanceServiceTypeMaster, ["category", "default_basis"]
)
EngineOilSerializer = master_serializer(
    m.EngineOilMaster, ["brand", "grade", "oil_type", "pack_size", "default_km"]
)
PartConsumableSerializer = master_serializer(m.PartConsumableMaster, ["category", "unit", "default_life_km"])
WorkshopVendorSerializer = master_serializer(
    m.WorkshopVendorMaster, ["vendor_type", "contact_person", "phone"]
)
CostCenterSerializer = master_serializer(
    m.CostCenterMaster,
    ["department_id", "description"],
    {
        "department_id": serializers.PrimaryKeyRelatedField(
            source="department", queryset=m.DepartmentMaster.objects.all()
        )
    },
)
DrivingLicenceTypeSerializer = master_serializer(
    m.DrivingLicenceTypeMaster, ["description", "default_validity_years"]
)
FuelTypeSerializer = master_serializer(m.FuelTypeMaster, ["unit", "description"])
GearOilTypeSerializer = master_serializer(m.GearOilTypeMaster, ["description"])
TyreTypeSerializer = master_serializer(
    m.TyreTypeMaster, ["brand", "size", "type_pattern", "ply_load", "std_life_km"]
)
DocumentTypeSerializer = master_serializer(
    m.DocumentTypeMaster, ["category", "default_alert_days", "mandatory"]
)
LocationSiteSerializer = master_serializer(m.LocationSiteMaster, ["address"])
GateSerializer = master_serializer(
    m.GateMaster,
    ["location_id", "description"],
    {
        "location_id": serializers.PrimaryKeyRelatedField(
            source="location", queryset=m.LocationSiteMaster.objects.all()
        )
    },
)
