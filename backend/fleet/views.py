from django.db import transaction
from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.access import PermissionRulesMixin, any_of, can_read, crud_rules
from audit.models import AuditLogEntry
from accounts.models import KioskDevice
from fleet.models import Driver, FuelEntry, Guard, OdometerIssue, Trip, Vehicle
from fleet.serializers import (
    DriverSerializer,
    FuelEntrySerializer,
    GateInSerializer,
    GateOutSerializer,
    GuardSerializer,
    OdometerIssueSerializer,
    ReadOdometerSerializer,
    ResolveOdometerIssueSerializer,
    SetAllowedToExitSerializer,
    TripSerializer,
    VehicleListSerializer,
    VehicleSerializer,
)
from fleet.services import OdometerImageTooLarge, extract_odometer_reading

GATE_ANY = ("gate.exit", "gate.entry", "gate.fuel")
# A gate device or a staff member doing gate work — see accounts.access.
KIOSK_OR_GATE = any_of(*GATE_ANY, kiosk=True)


class VehicleViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.prefetch_related("photos").order_by("registration_number")
    serializer_class = VehicleSerializer
    filterset_fields = ["status", "allowed_to_exit"]

    def get_serializer_class(self):
        # The list screen shows no vehicle imagery, and every photo costs a
        # presigned-URL signing round on the way out. Only the detail response,
        # which actually renders the gallery, pays for it.
        if self.action == "list":
            return VehicleListSerializer
        return VehicleSerializer

    permission_rules = crud_rules(
        "vehicles",
        by_code=KIOSK_OR_GATE,
        read_odometer=KIOSK_OR_GATE,
        gate_in=any_of("gate.entry", kiosk=True),
        set_allowed_to_exit=any_of("vehicles.manage_exit_access"),
    )

    def destroy(self, request, *args, **kwargs):
        vehicle = self.get_object()
        # Trip.vehicle/FuelEntry.vehicle are PROTECT (would 500 uncaught), but
        # MaintenanceRecord.vehicle/DocumentRecord.vehicle are CASCADE — without
        # this check those would just silently vanish along with the vehicle.
        # Checking every relation up front covers both cases uniformly.
        blockers = []
        if n := vehicle.trips.count():
            blockers.append(f"{n} trip(s)")
        if n := vehicle.fuel_entries.count():
            blockers.append(f"{n} fuel entry(ies)")
        if n := vehicle.maintenance_records.count():
            blockers.append(f"{n} maintenance record(s)")
        if n := vehicle.documents.count():
            blockers.append(f"{n} document(s)")
        if blockers:
            raise ValidationError({"detail": f"Cannot delete this vehicle — it has {', '.join(blockers)} on record."})
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors vehicles.service.ts getVehicleByCode's 3-way match."""
        vehicle = Vehicle.objects.filter(
            Q(qr_code=code) | Q(registration_number=code) | Q(internal_id=code)
        ).first()
        if not vehicle:
            return Response(status=404)
        # Kiosk gate path — identifies the vehicle, never shows its photos, so
        # it skips the gallery's presigned-URL signing like the list does.
        return Response(VehicleListSerializer(vehicle).data)

    @action(detail=False, methods=["post"], url_path="read-odometer")
    def read_odometer(self, request):
        """OCRs a kiosk-captured odometer photo. No vehicle is known yet at this
        point in the Exit/Entry/Fuel flow — the vehicle is only identified once
        the QR code from the same photo is decoded client-side — so this is
        vehicle-agnostic, unlike the other kiosk actions above.

        confident=False means the kiosk must force a retake: there's no manual
        digit-entry fallback in the kiosk UI, so a shaky OCR read can't be
        allowed through as a guess.
        """
        serializer = ReadOdometerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = extract_odometer_reading(serializer.validated_data["image"])
        except OdometerImageTooLarge as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"reading": result.reading, "confident": result.confident})

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

            data = serializer.validated_data
            trip = data["trip"]
            trip.in_time = timezone.now()
            trip.odometer_in = data.get("odometer_in")
            # Only computable once both ends are known; a trip whose opening or
            # closing reading is still pending gets its distance on resolution.
            trip.trip_km = (
                trip.odometer_in - trip.odometer_out
                if trip.odometer_in is not None and trip.odometer_out is not None
                else None
            )
            trip.status = Trip.Status.COMPLETED
            trip.return_condition = data["return_condition"]
            trip.remarks = data.get("remarks") or trip.remarks
            if isinstance(request.auth, KioskDevice):
                trip.kiosk_device = request.auth
            trip.save()

            vehicle.status = (
                Vehicle.Status.AVAILABLE
                if trip.return_condition == Trip.ReturnCondition.OK
                else Vehicle.Status.WORKSHOP
            )
            if trip.odometer_in is not None:
                vehicle.current_odometer = trip.odometer_in
                vehicle.save(update_fields=["current_odometer", "status"])
            else:
                OdometerIssue.objects.create(
                    vehicle=vehicle,
                    trip=trip,
                    stage=OdometerIssue.Stage.GATE_IN,
                    photo=data["odometer_issue_photo"],
                    attempts=data.get("odometer_issue_attempts", 0),
                    raised_by=trip.guard,
                )
                vehicle.save(update_fields=["status"])

        return Response(TripSerializer(trip).data)


class DriverViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by("name")
    serializer_class = DriverSerializer

    permission_rules = crud_rules("drivers", by_code=KIOSK_OR_GATE)

    def destroy(self, request, *args, **kwargs):
        driver = self.get_object()
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            trip_count = driver.trips.count()
            # {"detail": ...} rather than a bare string: ValidationError("...") renders
            # as a top-level ["..."] array, which the frontend's error-message
            # extraction (expecting {"detail": ...} or {"field": ["..."]}) doesn't
            # recognize, silently falling back to a generic "Request failed" message.
            raise ValidationError(
                {"detail": f"Cannot delete this driver — they have {trip_count} trip(s) on record."}
            )

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors drivers.service.ts getDriverByCode's 2-way match."""
        driver = Driver.objects.filter(Q(employee_id=code) | Q(company_id_code=code)).first()
        if not driver:
            return Response(status=404)
        return Response(DriverSerializer(driver).data)


class GuardViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Guard.objects.all().order_by("name")
    serializer_class = GuardSerializer

    permission_rules = crud_rules("guards", by_code=KIOSK_OR_GATE)

    @action(detail=False, methods=["get"], url_path="by-code/(?P<code>[^/]+)")
    def by_code(self, request, code=None):
        """Mirrors guards.service.ts getGuardByCode's exact match."""
        guard = Guard.objects.filter(guard_id=code).first()
        if not guard:
            return Response(status=404)
        return Response(GuardSerializer(guard).data)


class TripViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Trip.objects.all().order_by("-out_time")
    serializer_class = TripSerializer
    filterset_fields = ["status", "vehicle_id", "driver_id"]

    # No plain "create": trips only ever start at the gate (gate_out).
    permission_rules = crud_rules(
        "trips",
        create=any_of("trips.edit"),
        gate_out=any_of("gate.exit", kiosk=True),
    )

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
                odometer_out=data.get("odometer_out"),
                status=Trip.Status.OPEN,
                expected_return=data.get("expected_return"),
                remarks=data.get("remarks", ""),
                # request.auth is the KioskDevice when a gate tablet called;
                # None when a staff member did it from the admin app.
                kiosk_device=request.auth if isinstance(request.auth, KioskDevice) else None,
            )

            vehicle.status = Vehicle.Status.OUTSIDE
            if data.get("odometer_out") is not None:
                vehicle.current_odometer = data["odometer_out"]
                vehicle.save(update_fields=["status", "current_odometer"])
            else:
                # The reading is pending an admin, so the vehicle keeps its last
                # known-good odometer — advancing it to a guess would corrupt
                # the baseline every later reading is validated against.
                OdometerIssue.objects.create(
                    vehicle=vehicle,
                    trip=trip,
                    stage=OdometerIssue.Stage.GATE_OUT,
                    photo=data["odometer_issue_photo"],
                    attempts=data.get("odometer_issue_attempts", 0),
                    raised_by_id=data.get("guard_id"),
                )
                vehicle.save(update_fields=["status"])

        return Response(TripSerializer(trip).data, status=201)


class FuelEntryViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = FuelEntry.objects.select_related("vehicle", "driver").all()
    serializer_class = FuelEntrySerializer
    filterset_fields = ["vehicle", "driver"]

    def perform_create(self, serializer):
        # Same as the gate endpoints: record the tablet when one filed this.
        device = self.request.auth if isinstance(self.request.auth, KioskDevice) else None
        serializer.save(kiosk_device=device)

    permission_rules = crud_rules(
        "fuel",
        # The Fuel kiosk posts these from the gate; the Fuel page adds them too.
        create=any_of("fuel.create", "gate.fuel", kiosk=True),
    )


class OdometerIssueViewSet(PermissionRulesMixin, viewsets.ReadOnlyModelViewSet):
    """Odometers a guard could not get read, for an admin to resolve.

    Deliberately read-only plus a single `resolve` action: guards raise these
    from the gate apps as a side effect of Gate-Out/Gate-In, and nobody edits
    them by hand. Resolution is admin-side only — the whole point is that the
    person at the gate is not the one typing the number.
    """

    queryset = OdometerIssue.objects.select_related("vehicle", "trip", "raised_by", "resolved_by")
    serializer_class = OdometerIssueSerializer
    filterset_fields = ["status", "stage", "vehicle"]

    permission_rules = {
        "list": can_read("odometer_issues"),
        "retrieve": can_read("odometer_issues"),
        "resolve": any_of("odometer_issues.resolve"),
    }

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        with transaction.atomic():
            # No select_related here: `trip` is nullable, so joining it makes
            # Postgres refuse the row lock ("FOR UPDATE cannot be applied to the
            # nullable side of an outer join"). The related rows are re-fetched
            # under their own locks below anyway.
            issue = get_object_or_404(OdometerIssue.objects.select_for_update(), pk=pk)
            serializer = ResolveOdometerIssueSerializer(data=request.data, context={"issue": issue})
            serializer.is_valid(raise_exception=True)
            reading = serializer.validated_data["reading"]

            vehicle = Vehicle.objects.select_for_update().get(pk=issue.vehicle_id)
            trip = issue.trip
            if trip:
                trip = Trip.objects.select_for_update().get(pk=trip.pk)
                if issue.stage == OdometerIssue.Stage.GATE_OUT:
                    trip.odometer_out = reading
                else:
                    trip.odometer_in = reading
                # Now that both ends may be known, the distance can be filled in.
                if trip.odometer_out is not None and trip.odometer_in is not None:
                    trip.trip_km = trip.odometer_in - trip.odometer_out
                trip.save(update_fields=["odometer_out", "odometer_in", "trip_km"])
            elif issue.fuel_entry_id:
                FuelEntry.objects.filter(pk=issue.fuel_entry_id).update(odometer=reading)

            # The vehicle's odometer was left at its last known-good value while
            # this was pending, so it only moves forward now — and only if this
            # reading is actually newer than whatever has happened since.
            if reading > vehicle.current_odometer:
                vehicle.current_odometer = reading
                vehicle.save(update_fields=["current_odometer"])

            issue.reading = reading
            issue.status = OdometerIssue.Status.RESOLVED
            issue.resolved_by = request.user if request.user.is_authenticated else None
            issue.resolved_at = timezone.now()
            issue.save(update_fields=["reading", "status", "resolved_by", "resolved_at"])

            AuditLogEntry.objects.create(
                user=request.user if request.user.is_authenticated else None,
                transaction=f"Odometer reading resolved — {vehicle.registration_number}",
                previous_value="Unreadable at the gate",
                new_value=f"{reading} KM",
                reason=f"{issue.get_stage_display()}{f' — {trip.trip_number}' if trip else ''}",
            )

        return Response(OdometerIssueSerializer(issue, context={"request": request}).data)
