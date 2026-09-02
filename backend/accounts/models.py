import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    The real identity behind what src/hooks/use-session.ts currently fakes —
    that store just holds a freely-settable `role` with no login at all.
    Lives in a TENANT_APP: one company's users don't exist, even at the
    database level, in another company's schema.
    """

    class Role(models.TextChoices):
        ADMIN = "admin"
        FLEET_MANAGER = "fleet_manager"
        GATE_GUARD = "gate_guard"
        MANAGEMENT = "management"
        DRIVER = "driver"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices)
    active = models.BooleanField(default=True)

    @property
    def name(self) -> str:
        return self.get_full_name() or self.username


def generate_kiosk_key() -> str:
    return secrets.token_hex(32)


class KioskDevice(models.Model):
    """
    A physical gate kiosk (Exit/Entry/Fuel) authenticates as a device, not as
    a user — the guard/driver it scans are data being recorded, not who's
    "logged in" to the API. Checked via the X-Kiosk-Api-Key header by
    KioskDeviceAuthentication below. Tenant-scoped for free: this table lives
    in the tenant schema already resolved from the request's host, so a key
    from one tenant can never authenticate against another tenant's API host.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    api_key = models.CharField(max_length=64, unique=True, editable=False, default=generate_kiosk_key)
    active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name

    def touch(self) -> None:
        self.last_seen_at = timezone.now()
        self.save(update_fields=["last_seen_at"])
