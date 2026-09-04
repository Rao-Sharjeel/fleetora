from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django_tenants.utils import schema_context

from datetime import date, timedelta

from accounts.models import KioskDevice, User
from common.models import Sequence
from common.management.commands import _master_fixtures as mf
from documents.models import DocumentRecord
from fleet.models import Driver, FuelEntry, Guard, Trip, Vehicle
from maintenance.models import MaintenanceRecord, Tyre
from masterdata import models as md
from requisitions.models import Requisition
from tenants.models import Tenant

# Transcribed directly from src/services/mock/fixtures.ts so the same test
# codes already relied on by the kiosk (QR-VEH-001, GRD-1025, EMP-102, ...)
# keep working once the frontend swaps over to this API.

DRIVERS = [
    dict(
        employee_id="EMP-101", name="Muhammad Aslam", cnic="35201-1234567-1", mobile="0300-1234567",
        licence_number="DL-88213", licence_category="LTV", licence_expiry="2027-03-10",
        department="Transport", status=Driver.Status.ACTIVE,
    ),
    dict(
        employee_id="EMP-102", name="Imran", cnic="35201-7654321-2", mobile="0301-7654321",
        licence_number="DL-55120", licence_category="LTV", licence_expiry="2026-09-30",
        department="Procurement", status=Driver.Status.ACTIVE,
    ),
    dict(
        employee_id="EMP-103", name="Kashif Mahmood", cnic="35201-1122334-3", mobile="0302-1122334",
        licence_number="DL-33021", licence_category="HTV", licence_expiry="2026-10-05",
        department="Warehouse", status=Driver.Status.ACTIVE,
    ),
]

GUARDS = [
    dict(
        guard_id="GRD-1025", name="Muhammad Ali", cnic="35201-9876543-1", mobile="0300-9876543",
        department="Security", assigned_gate_code="GATE-01", duty_shift="Day (08:00 - 20:00)",
        guard_type="Security Guard", authorized_exit=True, authorized_in=True, status=Guard.Status.ACTIVE,
    ),
    dict(
        guard_id="GRD-1026", name="Ali Hassan", cnic="35201-9876543-2", mobile="0301-9876543",
        department="Security", assigned_gate_code="GATE-02", duty_shift="Night (20:00 - 08:00)",
        guard_type="Security Guard", authorized_exit=True, authorized_in=True, status=Guard.Status.ACTIVE,
    ),
]

# vehicle dicts reference the driver's employee_id, resolved to a real FK below
VEHICLES = [
    dict(
        internal_id="VEH-001", registration_number="LEA-1234", company="Head Office", make="Toyota",
        model="Hilux", variant="Revo", year=2022, colour="White", fuel_type=Vehicle.FuelType.DIESEL,
        engine_number="2GD-1029384", chassis_number="MR0FR22G701234567", department_cost_centre="Sales",
        assigned_driver_employee_id="EMP-101", expected_fuel_average_kmpl=10, current_odometer=134650,
        status=Vehicle.Status.AVAILABLE, qr_code="QR-VEH-001",
    ),
    dict(
        internal_id="VEH-002", registration_number="LEX-7865", company="Head Office", make="Suzuki",
        model="Cultus", year=2021, colour="Silver", fuel_type=Vehicle.FuelType.PETROL,
        department_cost_centre="Procurement", assigned_driver_employee_id="EMP-102",
        expected_fuel_average_kmpl=14, current_odometer=83412, status=Vehicle.Status.OUTSIDE,
        qr_code="QR-VEH-002",
    ),
    dict(
        internal_id="VEH-003", registration_number="LEB-4521", company="Warehouse", make="Honda",
        model="Civic", year=2020, colour="Black", fuel_type=Vehicle.FuelType.PETROL,
        department_cost_centre="Admin", expected_fuel_average_kmpl=12, current_odometer=61200,
        status=Vehicle.Status.WORKSHOP, qr_code="QR-VEH-003",
    ),
    dict(
        internal_id="VEH-004", registration_number="LEC-9081", company="Head Office", make="Toyota",
        model="Corolla", year=2019, colour="Grey", fuel_type=Vehicle.FuelType.PETROL,
        expected_fuel_average_kmpl=13, current_odometer=98410, status=Vehicle.Status.AVAILABLE,
        qr_code="QR-VEH-004",
    ),
]

USERS = [
    dict(username="admin", email="admin@example.com", role=User.Role.ADMIN, is_staff=True, is_superuser=True),
    dict(username="fleetmanager", email="fleet@example.com", role=User.Role.FLEET_MANAGER),
    dict(username="gateguard", email="guard@example.com", role=User.Role.GATE_GUARD),
    dict(username="management", email="management@example.com", role=User.Role.MANAGEMENT),
    dict(username="driveruser", email="driver@example.com", role=User.Role.DRIVER),
]
DEFAULT_PASSWORD = "fleetora-dev-2026"


class Command(BaseCommand):
    help = "Seeds demo data (matching src/services/mock/fixtures.ts) into one tenant's schema. Idempotent."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant schema_name to seed into")

    def handle(self, *args, **options):
        schema_name = options["tenant"]
        try:
            tenant = Tenant.objects.get(schema_name=schema_name)
        except Tenant.DoesNotExist as exc:
            raise CommandError(
                f"No tenant with schema_name '{schema_name}'. Create one first with create_tenant."
            ) from exc

        # User/KioskDevice are SHARED_APP models now (one platform-wide table,
        # tenant resolved via their own `tenant` FK) — seeded here, before
        # switching schema, not inside schema_context like the tenant-scoped
        # models below.
        self._seed_users_and_devices(tenant)

        with schema_context(tenant.schema_name):
            self._seed(tenant)

    def _seed_users_and_devices(self, tenant):
        for payload in USERS:
            user, created = User.objects.get_or_create(
                username=payload["username"],
                defaults={**payload, "tenant": tenant},
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
        self.stdout.write(self.style.SUCCESS(f"Users ready ({len(USERS)}), password: {DEFAULT_PASSWORD}"))

        device, created = KioskDevice.objects.get_or_create(name="Exit Kiosk (dev)", tenant=tenant, defaults={})
        if created:
            self.stdout.write(self.style.SUCCESS(f"Kiosk device API key: {device.api_key}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Kiosk device API key (existing): {device.api_key}"))

    def _seed(self, tenant):
        self._seed_master_data()

        drivers_by_employee_id = {}
        for payload in DRIVERS:
            driver, _ = Driver.objects.get_or_create(
                employee_id=payload["employee_id"], defaults=payload
            )
            drivers_by_employee_id[payload["employee_id"]] = driver
        self.stdout.write(self.style.SUCCESS(f"Drivers ready ({len(DRIVERS)})"))

        for payload in GUARDS:
            payload = dict(payload)
            gate_code = payload.pop("assigned_gate_code", None)
            gate = md.GateMaster.objects.filter(code=gate_code).first() if gate_code else None
            Guard.objects.get_or_create(
                guard_id=payload["guard_id"], defaults={**payload, "assigned_gate": gate}
            )
        self.stdout.write(self.style.SUCCESS(f"Guards ready ({len(GUARDS)})"))

        vehicles_by_internal_id = {}
        for payload in VEHICLES:
            payload = dict(payload)
            driver_key = payload.pop("assigned_driver_employee_id", None)
            assigned_driver = drivers_by_employee_id.get(driver_key) if driver_key else None
            vehicle, _ = Vehicle.objects.get_or_create(
                internal_id=payload["internal_id"],
                defaults={**payload, "assigned_driver": assigned_driver},
            )
            vehicles_by_internal_id[payload["internal_id"]] = vehicle
        self.stdout.write(self.style.SUCCESS(f"Vehicles ready ({len(VEHICLES)})"))

        # veh-002 is seeded "outside" — give it the matching open trip, mirroring
        # trp-008541 in fixtures.ts, so gate-in and double-exit scenarios are both testable.
        veh_002 = vehicles_by_internal_id["VEH-002"]
        drv_002 = drivers_by_employee_id["EMP-102"]
        if not Trip.objects.filter(vehicle=veh_002, status=Trip.Status.OPEN).exists():
            Trip.objects.create(
                vehicle=veh_002,
                driver=drv_002,
                purpose="Purchase",
                destination="Shah Alam",
                requested_by="Accounts",
                department="Procurement",
                out_time=timezone.now(),
                odometer_out=veh_002.current_odometer,
                status=Trip.Status.OPEN,
            )
        self.stdout.write(self.style.SUCCESS("Open trip for LEX-7865 ready"))

        self._seed_operations(vehicles_by_internal_id, drivers_by_employee_id)

        # Advance the sequences past the manually-seeded numbers above, so the
        # next *real* create() call (via the API) doesn't collide with EMP-103/VEH-004.
        Sequence.objects.update_or_create(
            scope="driver_employee_id", year=0, defaults={"next_value": len(DRIVERS) + 1}
        )
        Sequence.objects.update_or_create(
            scope="vehicle_internal_id", year=0, defaults={"next_value": len(VEHICLES) + 1}
        )
        self.stdout.write(self.style.SUCCESS("Sequences advanced past seeded records"))

    def _seed_master_data(self):
        """All 17 master tables. Simple ones share one loop; the four with FKs
        resolve their parent by code."""
        simple = [
            (md.VehicleTypeMaster, mf.VEHICLE_TYPES),
            (md.VehicleMakeMaster, mf.VEHICLE_MAKES),
            (md.DepartmentMaster, mf.DEPARTMENTS),
            (md.VehiclePurposeMaster, mf.VEHICLE_PURPOSES),
            (md.MaintenanceServiceTypeMaster, mf.MAINTENANCE_SERVICE_TYPES),
            (md.EngineOilMaster, mf.ENGINE_OILS),
            (md.PartConsumableMaster, mf.PARTS_CONSUMABLES),
            (md.WorkshopVendorMaster, mf.WORKSHOP_VENDORS),
            (md.DrivingLicenceTypeMaster, mf.DRIVING_LICENCE_TYPES),
            (md.FuelTypeMaster, mf.FUEL_TYPES),
            (md.GearOilTypeMaster, mf.GEAR_OIL_TYPES),
            (md.TyreTypeMaster, mf.TYRE_TYPES),
            (md.DocumentTypeMaster, mf.DOCUMENT_TYPES),
            (md.LocationSiteMaster, mf.LOCATION_SITES),
        ]
        count = 0
        for model, rows in simple:
            for code, name, extra in rows:
                model.objects.get_or_create(code=code, defaults={"name": name, **extra})
                count += 1

        # FK-bearing masters, resolved by parent code
        for code, name, make_code, type_code, year_from in mf.VEHICLE_MODELS:
            md.VehicleModelMaster.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "make": md.VehicleMakeMaster.objects.get(code=make_code),
                    "vehicle_type": md.VehicleTypeMaster.objects.get(code=type_code),
                    "year_from": year_from,
                },
            )
            count += 1

        for code, name, dept_code, description in mf.COST_CENTERS:
            md.CostCenterMaster.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "department": md.DepartmentMaster.objects.get(code=dept_code),
                    "description": description,
                },
            )
            count += 1

        for code, name, loc_code, description in mf.GATES:
            md.GateMaster.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "location": md.LocationSiteMaster.objects.get(code=loc_code),
                    "description": description,
                },
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Master data ready ({count} records across 17 tables)"))

    def _seed_operations(self, vehicles, drivers):
        """Maintenance, tyres, documents, fuel and requisitions for the seeded fleet."""
        veh1 = vehicles["VEH-001"]
        veh3 = vehicles["VEH-003"]
        drv1 = drivers["EMP-101"]
        drv2 = drivers["EMP-102"]

        MaintenanceRecord.objects.get_or_create(
            vehicle=veh1,
            date=date(2026, 8, 22),
            defaults={
                "odometer": 130150,
                "workshop": "Toyota Authorized Workshop",
                "categories": ["engine"],
                "total_cost": 18500,
                "next_due_odometer": 135150,
                "next_due_date": date(2027, 2, 22),
                "remarks": "Engine oil change — Shell Helix HX7 10W-40, 5.5L",
            },
        )
        MaintenanceRecord.objects.get_or_create(
            vehicle=veh3,
            date=date(2026, 7, 15),
            defaults={
                "odometer": 60000,
                "workshop": "City Auto Care",
                "categories": ["brakes", "suspension"],
                "total_cost": 21600,
            },
        )

        for code, position, serial in [
            ("TYR-0011", "Front Left", "BS201938"),
            ("TYR-0012", "Front Right", "BS201939"),
        ]:
            Tyre.objects.get_or_create(
                tyre_code=code,
                defaults={
                    "brand": "Bridgestone",
                    "size": "265/65R17",
                    "serial_number": serial,
                    "vehicle": veh1,
                    "wheel_position": position,
                    "install_date": date(2025, 10, 1),
                    "install_odometer": 126850,
                    "expected_life_km": 40000,
                    "status": Tyre.Status.IN_USE,
                },
            )

        insurance = md.DocumentTypeMaster.objects.get(code="DOC-02")
        permit = md.DocumentTypeMaster.objects.get(code="DOC-04")
        licence = md.DocumentTypeMaster.objects.get(code="DOC-08")
        DocumentRecord.objects.get_or_create(
            vehicle=veh1, document_type=insurance,
            defaults={"document_number": "INS-88213", "issue_date": date(2025, 9, 1),
                      "expiry_date": date.today() + timedelta(days=9)},
        )
        DocumentRecord.objects.get_or_create(
            vehicle=vehicles["VEH-002"], document_type=permit,
            defaults={"expiry_date": date.today() - timedelta(days=2)},
        )
        DocumentRecord.objects.get_or_create(
            driver=drv2, document_type=licence,
            defaults={"expiry_date": date.today() + timedelta(days=29)},
        )

        FuelEntry.objects.get_or_create(
            vehicle=veh1, driver=drv1, odometer=134500,
            defaults={"fuel_type": "diesel", "litres": 45, "rate_per_litre": 289,
                      "fuel_station": "PSO Gulberg", "payment_method": "Fuel Card", "full_tank": True},
        )
        FuelEntry.objects.get_or_create(
            vehicle=vehicles["VEH-002"], driver=drv2, odometer=83000,
            defaults={"fuel_type": "petrol", "litres": 30, "rate_per_litre": 272,
                      "fuel_station": "Shell Model Town", "payment_method": "Cash", "full_tank": True},
        )

        if not Requisition.objects.exists():
            Requisition.objects.create(
                requested_by="Accounts", department="Finance", purpose="Bank Work",
                destination="Gulberg", required_date_time=timezone.now(),
            )

        self.stdout.write(self.style.SUCCESS("Maintenance, tyres, documents, fuel & requisitions ready"))
