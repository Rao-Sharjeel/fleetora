import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Tenant(TenantMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    auto_create_schema = True
    auto_drop_schema = False  # never silently drop a customer's data on delete

    def __str__(self) -> str:
        return self.name


class Domain(DomainMixin):
    pass


class SuperAdmin(models.Model):
    """
    Manages tenants across the whole platform. Deliberately not accounts.User
    (tenant-scoped, doesn't even have a table outside a tenant's own schema)
    and not Django's built-in auth User — a fully separate table, only ever
    reachable via the public-tenant domain (see fleetora/urls_public.py and
    the bootstrap_public_tenant command).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True, default="")
    password = models.CharField(max_length=128)
    name = models.CharField(max_length=120, blank=True, default="")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # DRF's permission plumbing expects an is_authenticated flag on request.user.
    is_authenticated = True

    def set_password(self, raw_password: str) -> None:
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password)

    def __str__(self) -> str:
        return self.username
