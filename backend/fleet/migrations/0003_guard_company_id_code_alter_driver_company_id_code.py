from django.db import migrations, models


def backfill_company_id_code(apps, schema_editor):
    """Existing rows had no Company ID — seed one from each row's own system ID
    (Driver's blank default, Guard's newly added nullable column) so the field
    can become required + unique without touching already-issued IDs."""
    Driver = apps.get_model("fleet", "Driver")
    Guard = apps.get_model("fleet", "Guard")
    for driver in Driver.objects.filter(company_id_code=""):
        driver.company_id_code = str(driver.id)
        driver.save(update_fields=["company_id_code"])
    for guard in Guard.objects.filter(company_id_code__isnull=True):
        guard.company_id_code = str(guard.id)
        guard.save(update_fields=["company_id_code"])


class Migration(migrations.Migration):

    dependencies = [
        ("fleet", "0002_remove_guard_assigned_gate_id_guard_assigned_gate_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="guard",
            name="company_id_code",
            field=models.CharField(max_length=40, null=True, blank=True),
        ),
        migrations.RunPython(backfill_company_id_code, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="driver",
            name="company_id_code",
            field=models.CharField(max_length=40, unique=True),
        ),
        migrations.AlterField(
            model_name="guard",
            name="company_id_code",
            field=models.CharField(max_length=40, unique=True),
        ),
    ]
