from django.contrib import admin

from fleet.models import Driver, FuelEntry, Guard, Trip, Vehicle

admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(Guard)
admin.site.register(Trip)
admin.site.register(FuelEntry)
