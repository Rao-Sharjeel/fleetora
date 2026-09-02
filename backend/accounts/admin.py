from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import KioskDevice, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (("Fleetora", {"fields": ("role", "active")}),)
    list_display = ("username", "email", "role", "active", "is_staff")


@admin.register(KioskDevice)
class KioskDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "api_key", "active", "last_seen_at")
    readonly_fields = ("api_key", "last_seen_at", "created_at")
