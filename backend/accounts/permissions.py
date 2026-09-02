from rest_framework.permissions import BasePermission

from accounts.models import KioskDevice


class RoleAllowList(BasePermission):
    """
    Base class for a permission that only allows a fixed set of roles — the
    server-side enforcement of what src/App.tsx's <RoleGuard allow={[...]}>
    lists only ever pretended to do client-side.
    """

    allowed_roles: frozenset[str] = frozenset()

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


def allow_roles(*roles: str) -> type[RoleAllowList]:
    return type("AllowRoles", (RoleAllowList,), {"allowed_roles": frozenset(roles)})


class IsKioskDevice(BasePermission):
    def has_permission(self, request, view) -> bool:
        return isinstance(request.auth, KioskDevice)


def allow_kiosk_or_roles(*roles: str) -> type[BasePermission]:
    """
    For the 5 endpoints a gate kiosk calls directly: accept either a valid
    kiosk device key, or a logged-in staff member with one of `roles` (e.g. a
    gate_guard using the main app's own /gate/out page instead of a kiosk).
    """
    role_permission = allow_roles(*roles)

    class AllowKioskOrRoles(BasePermission):
        def has_permission(self, request, view) -> bool:
            return IsKioskDevice().has_permission(request, view) or role_permission().has_permission(request, view)

    return AllowKioskOrRoles
