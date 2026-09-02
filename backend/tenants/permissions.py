from rest_framework.permissions import BasePermission

from tenants.models import SuperAdmin


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return isinstance(request.user, SuperAdmin)
