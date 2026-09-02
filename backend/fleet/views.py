from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import allow_kiosk_or_roles, allow_roles
from audit.models import AuditLogEntry
from fleet.models import Driver, FuelEntry, Guard, Trip, Vehicle
from fleet.serializers import (
    DriverSerializer,
    FuelEntrySerializer,
    GateInSerializer,
    GateOutSerializer,
    GuardSerializer,
    SetAllowedToExitSerializer,
    TripSerializer,
    VehicleSerializer,
)

# Collapses down to the 5 role-permission sets that already exist in src/App.tsx's
# <RoleGuard allow={[...]}> lists — see accounts/permissions.py.
READ_HEAVY = allow_roles("admin", "fleet_manager", "management")
OPERATIONAL_WRITE = allow_roles("admin", "fleet_manager")
ADMIN_ONLY = allow_roles("admin")
KIOSK_OR_GATE_STAFF = allow_kiosk_or_roles("admin", "fleet_manager", "gate_guard")
# Driver/Guard list & retrieve specifically (not Vehicle/Trip/FuelEntry, which stay
# READ_HEAVY-only — trip history and fuel cost are more sensitive than a name/ID
# picklist): the Gate-Out screen's manual-select fallback needs a gate_guard to be
# able to list drivers/guards, not just look one up by a scanned code.
READ_HEAVY_OR_GATE_STAFF = allow_roles("admin", "fleet_manager", "management", "gate_guard")


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by("registration_number")
    serializer_class = VehicleSerializer
    filterset_fields = ["status", "allowed_to_exit"]

    def get_permissions(self):
        if self.action in ("by_code", "gate_in"):
            return [KIOSK_OR_GATE_STAFF()]
        if self.action in ("list", "retrieve"):
            # A gate_guard needs this for the "Currently Out" gate tile
            # (vehicles-outside-page.tsx), not just by-code lookup.
            return [READ_HEAVY_OR_GATE_STAFF()]
        return [OPERATIONAL_WRITE()]

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors vehicles.service.ts getVehicleByCode's 3-way match."""
        vehicle = Vehicle.objects.filter(
            Q(qr_code=code) | Q(registration_number=code) | Q(internal_id=code)
        ).first()
        if not vehicle:
            return Response(status=404)
        return Response(VehicleSerializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="set-allowed-to-exit")
    def set_allowed_to_exit(self, request, pk=None):
        vehicle = get_object_or_404(Vehicle, pk=pk)
        serializer = SetAllowedToExitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        allowed = serializer.validated_data["allowed"]
        reason = serializer.validated_data.get("reason", "")

        previous = "Allowed to Exit" if vehicle.allowed_to_exit else "Not Allowed to Exit"
        vehicle.allowed_to_exit = allowed
        vehicle.allowed_to_exit_reason = "" if allowed else reason
        vehicle.allowed_to_exit_updated_by = request.user if request.user.is_authenticated else None
        vehicle.allowed_to_exit_updated_at = timezone.now()
        vehicle.save()

        AuditLogEntry.objects.create(
            user=request.user if request.user.is_authenticated else None,
            transaction=f"Exit access changed — {vehicle.registration_number}",
            previous_value=previous,
            new_value="Allowed to Exit" if allowed else "Not Allowed to Exit",
            reason=reason,
        )
        return Response(VehicleSerializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="gate-in")
    def gate_in(self, request, pk=None):
        """Keyed by vehicle, not trip — a guard scans the vehicle at the gate,
        not a trip id they don't know. Mirrors trips.service.ts completeGateIn."""
        with transaction.atomic():
            vehicle = get_object_or_404(Vehicle.objects.select_for_update(), pk=pk)
            serializer = GateInSerializer(data=request.data, context={"vehicle": vehicle})
            serializer.is_valid(raise_exception=True)

            trip = serializer.validated_data["trip"]
            trip.in_time = timezone.now()
            trip.odometer_in = serializer.validated_data["odometer_in"]
            trip.trip_km = trip.odometer_in - trip.odometer_out
            trip.status = Trip.Status.COMPLETED
            trip.return_condition = serializer.validated_data["return_condition"]
            trip.remarks = serializer.validated_data.get("remarks") or trip.remarks
            trip.save()

            vehicle.current_odometer = trip.odometer_in
            vehicle.status = (
                Vehicle.Status.AVAILABLE
                if trip.return_condition == Trip.ReturnCondition.OK
                else Vehicle.Status.WORKSHOP
            )
            vehicle.save(update_fields=["current_odometer", "status"])

        return Response(TripSerializer(trip).data)


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by("name")
    serializer_class = DriverSerializer

    def get_permissions(self):
        if self.action == "by_code":
            return [KIOSK_OR_GATE_STAFF()]
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY_OR_GATE_STAFF()]
        return [OPERATIONAL_WRITE()]

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors drivers.service.ts getDriverByCode's 2-way match."""
        driver = Driver.objects.filter(Q(employee_id=code) | Q(company_id_code=code)).first()
        if not driver:
            return Response(status=404)
        return Response(DriverSerializer(driver).data)


class GuardViewSet(viewsets.ModelViewSet):
    queryset = Guard.objects.all().order_by("name")
    serializer_class = GuardSerializer

    def get_permissions(self):
        if self.action == "by_code":
            return [KIOSK_OR_GATE_STAFF()]
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY_OR_GATE_STAFF()]
        return [ADMIN_ONLY()]

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors guards.service.ts getGuardByCode's exact match."""
        guard = Guard.objects.filter(guard_id=code).first()
        if not guard:
            return Response(status=404)
        return Response(GuardSerializer(guard).data)


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all().order_by("-out_time")
    serializer_class = TripSerializer
    filterset_fields = ["status", "vehicle_id", "driver_id"]

    def get_permissions(self):
        if self.action == "gate_out":
            return [KIOSK_OR_GATE_STAFF()]
        if self.action in ("list", "retrieve"):
            # A gate_guard needs this to find a vehicle's open trip at Gate-In
            # (trips.service.ts getOpenTripForVehicle) — not just create one.
            return [READ_HEAVY_OR_GATE_STAFF()]
        return [OPERATIONAL_WRITE()]

    @action(detail=False, methods=["post"], url_path="gate-out")
    def gate_out(self, request):
        with transaction.atomic():
            serializer = GateOutSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            vehicle = data["vehicle"]

            trip = Trip.objects.create(
                vehicle=vehicle,
                driver_id=data["driver_id"],
                guard_id=data.get("guard_id"),
                purpose=data["purpose"],
                destination=data["destination"],
                requested_by=data["requested_by"],
                department=data["department"],
                out_time=timezone.now(),
                odometer_out=data["odometer_out"],
                status=Trip.Status.OPEN,
                expected_return=data.get("expected_return"),
                remarks=data.get("remarks", ""),
            )

            vehicle.status = Vehicle.Status.OUTSIDE
            vehicle.current_odometer = data["odometer_out"]
            vehicle.save(update_fields=["status", "current_odometer"])

        return Response(TripSerializer(trip).data, status=201)


class FuelEntryViewSet(viewsets.ModelViewSet):
    queryset = FuelEntry.objects.select_related("vehicle", "driver").all()
    serializer_class = FuelEntrySerializer
    filterset_fields = ["vehicle", "driver"]

    def get_permissions(self):
        if self.action == "create":
            # The Fuel kiosk posts these directly from the gate.
            return [KIOSK_OR_GATE_STAFF()]
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY()]
        return [OPERATIONAL_WRITE()]
