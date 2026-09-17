"""
API access rules on top of the permission catalog.

A permission gates a *screen* (drivers.view opens the Drivers page), but other
screens need to read that data too: the Fuel page lists vehicles for its
filter, a driver's profile shows their trips, the gate looks guards up. So
reading a resource is allowed with its own view permission *or* any
permission for a screen that depends on it (READ_ACCESS below). Writing always
needs the exact permission.

Admins pass every check here; a kiosk device passes only where a rule
explicitly allows one.
"""

from rest_framework.permissions import BasePermission

from accounts.models import KioskDevice
from accounts.permissions_catalog import GATE_PERMISSIONS

_GATE = tuple(GATE_PERMISSIONS)

# resource -> permissions that let a user *read* it through the API.
# Kept in step with which admin screens load which data (see the hooks each
# page in apps/admin/src/features/*/pages uses).
READ_ACCESS: dict[str, tuple[str, ...]] = {
    "vehicles": (
        "vehicles.view", "dashboard.view", "alerts.view", "documents.view", "fuel.view",
        "maintenance.view", "tyres.view", "trips.view", "reports.view",
        "drivers.create", "drivers.edit",  # driver form picks an assigned vehicle
        *_GATE,
    ),
    "drivers": (
        "drivers.view", "vehicles.view", "documents.view", "trips.view", "reports.view", *_GATE,
    ),
    "guards": ("guards.view", "gate.exit"),
    "trips": (
        "trips.view", "dashboard.view", "reports.view",
        "vehicles.view", "drivers.view", "guards.view",  # history tabs on profile pages
        *_GATE,  # "currently out" at the gate
    ),
    "fuel": ("fuel.view", "dashboard.view", "reports.view", "vehicles.view", "drivers.view"),
    "maintenance": ("maintenance.view", "reports.view", "vehicles.view"),
    "tyres": ("tyres.view", "vehicles.view"),
    "documents": ("documents.view", "vehicles.view", "drivers.view"),
    "alerts": ("alerts.view", "dashboard.view"),
    "requisitions": ("requisitions.view",),
    "odometer_issues": ("odometer_issues.view",),
    "audit": ("audit.view",),
    "settings": ("settings.view",),
}


def _user(request):
    user = request.user
    return user if user and user.is_authenticated else None


def _is_kiosk(request) -> bool:
    return isinstance(request.auth, KioskDevice)


class AdminOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = _user(request)
        return bool(user and user.is_admin)


class Authenticated(BasePermission):
    """Any logged-in user, admin or staff — for reference data every screen's
    dropdowns need (Master Setup lists)."""

    def has_permission(self, request, view) -> bool:
        return _user(request) is not None


def any_of(*codenames: str, kiosk: bool = False) -> type[BasePermission]:
    """Allowed when the user holds at least one of `codenames` — or, with
    kiosk=True, when a paired gate device is calling."""

    class AnyOf(BasePermission):
        required = codenames
        allows_kiosk = kiosk

        def has_permission(self, request, view) -> bool:
            if kiosk and _is_kiosk(request):
                return True
            user = _user(request)
            return bool(user and (user.is_admin or user.has_any_permission(codenames)))

    AnyOf.__name__ = f"AnyOf({', '.join(codenames)}{', kiosk' if kiosk else ''})"
    return AnyOf


def can_read(resource: str, kiosk: bool = False) -> type[BasePermission]:
    return any_of(*READ_ACCESS[resource], kiosk=kiosk)


def crud_rules(resource: str, **overrides) -> dict[str, type[BasePermission]]:
    """The standard action -> permission map for a resource's ViewSet."""
    rules = {
        "list": can_read(resource),
        "retrieve": can_read(resource),
        "create": any_of(f"{resource}.create"),
        "update": any_of(f"{resource}.edit"),
        "partial_update": any_of(f"{resource}.edit"),
        "destroy": any_of(f"{resource}.delete"),
    }
    rules.update(overrides)
    return rules


class PermissionRulesMixin:
    """ViewSet mixin: `permission_rules` maps each action to a permission
    class. An action with no rule is refused rather than left open — so a new
    @action can't ship unguarded by accident."""

    permission_rules: dict[str, type[BasePermission]] = {}

    def get_permissions(self):
        rule = self.permission_rules.get(self.action)
        if rule is None:
            return [_DenyAll()]
        return [rule()]


class _DenyAll(BasePermission):
    def has_permission(self, request, view) -> bool:
        return False
