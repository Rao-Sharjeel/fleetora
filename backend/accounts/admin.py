from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import KioskDevice, Role, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Fleetora", {"fields": ("tenant", "user_type", "role", "direct_permissions", "active")}),
    )
    list_display = ("username", "email", "user_type", "role", "active", "is_staff")
    filter_horizontal = ("direct_permissions",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "is_system")
    filter_horizontal = ("permissions",)


@admin.register(KioskDevice)
class KioskDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "api_key", "active", "last_seen_at")
    readonly_fields = ("api_key", "last_seen_at", "created_at")
