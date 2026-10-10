from django.contrib.auth.hashers import check_password, make_password
from django.db import models, transaction


class FleetSettings(models.Model):
    """
    Tenant-wide config, one row per tenant schema (a true singleton — tenant
    isolation is already the schema itself, so no FK is needed). Consumed by
    maintenance.serializers.MaintenanceRecordSerializer in place of the
    hardcoded 500/1000km thresholds the mock layer used to apply client-side.
    """

    due_soon_km = models.PositiveIntegerField(default=1000)
    urgent_km = models.PositiveIntegerField(default=500)

    # Hashed, never the raw value — this is a credential, and it is read back
    # by nothing. Blank means no password has been set, which disables
    # releasing a device entirely rather than leaving it open: an unset
    # password must not read as "no password required".
    kiosk_release_password = models.CharField(max_length=128, blank=True, default="")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "FleetSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def set_kiosk_release_password(self, raw: str) -> None:
        """Stores the password a kiosk must present to unpair itself. An empty
        value clears it, which turns releasing off."""
        self.kiosk_release_password = make_password(raw) if raw else ""

    def check_kiosk_release_password(self, raw: str) -> bool:
        if not self.kiosk_release_password:
            return False
        return check_password(raw, self.kiosk_release_password)


class Sequence(models.Model):
    """
    A real, collision-safe atomic counter — replaces the mock layer's
    `Math.floor(100000 + Math.random() * 899999)` style ID generation
    (trips.service.ts, requisitions.service.ts), which was never actually
    collision-safe. One row per (scope, year); `next_value` is incremented
    under `select_for_update()` inside a transaction.
    """

    scope = models.CharField(max_length=40)
    year = models.PositiveIntegerField()
    next_value = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["scope", "year"], name="unique_sequence_scope_year"),
        ]

    @classmethod
    def next(cls, scope: str, year: int) -> int:
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(scope=scope, year=year)
            value = seq.next_value
            seq.next_value += 1
            seq.save(update_fields=["next_value"])
            return value
