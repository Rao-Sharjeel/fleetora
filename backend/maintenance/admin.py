from django.contrib import admin

from maintenance.models import MaintenanceRecord, Tyre

admin.site.register(MaintenanceRecord)
admin.site.register(Tyre)
