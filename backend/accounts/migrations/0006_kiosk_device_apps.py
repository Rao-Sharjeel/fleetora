# A kiosk key used to name exactly one gate app; it now names a set of them,
# because the three gate apps became one app with a launcher and a phone pairs
# once for all the functions it is allowed to perform.
#
# Written by hand rather than left as makemigrations generated it: that version
# removed `app` and added `apps` with nothing in between, silently emptying the
# binding on every existing key. The backfill here is the whole point of the
# migration.
import django.contrib.postgres.fields
from django.db import migrations, models


def app_to_apps(apps_registry, schema_editor):
    KioskDevice = apps_registry.get_model("accounts", "KioskDevice")
    for device in KioskDevice.objects.exclude(app="").iterator():
        device.apps = [device.app]
        device.save(update_fields=["apps"])


def apps_to_app(apps_registry, schema_editor):
    # Reversing collapses a multi-function key onto its first function — lossy,
    # but the old column cannot hold more than one, and leaving it blank would
    # strand every device instead.
    KioskDevice = apps_registry.get_model("accounts", "KioskDevice")
    for device in KioskDevice.objects.exclude(apps=[]).iterator():
        device.app = device.apps[0]
        device.save(update_fields=["app"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_rbac_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="kioskdevice",
            name="apps",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[("exit", "Exit"), ("entry", "Entry"), ("fuel", "Fuel")], max_length=6
                ),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.RunPython(app_to_apps, apps_to_app),
        migrations.RemoveField(model_name="kioskdevice", name="app"),
    ]
