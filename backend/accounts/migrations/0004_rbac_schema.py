import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_kiosk_device_binding"),
        ("tenants", "0002_superadmin"),
    ]

    operations = [
        migrations.CreateModel(
            name="Permission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codename", models.CharField(max_length=80, unique=True)),
                ("label", models.CharField(max_length=200)),
                ("group", models.CharField(max_length=80)),
            ],
            options={"ordering": ["group", "codename"]},
        ),
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("is_system", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("permissions", models.ManyToManyField(blank=True, related_name="roles", to="accounts.permission")),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="roles", to="tenants.tenant"
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="role",
            constraint=models.UniqueConstraint(fields=("tenant", "name"), name="unique_role_name_per_tenant"),
        ),
        # Explicit rename, not remove+add: the old values are exactly what the
        # data migration needs to put each user on the right new role.
        migrations.RenameField(model_name="user", old_name="role", new_name="legacy_role"),
        migrations.AlterField(
            model_name="user",
            name="legacy_role",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="user",
            name="user_type",
            field=models.CharField(
                choices=[("admin", "Admin"), ("staff", "Staff")], default="staff", max_length=10
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="users",
                to="accounts.role",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="direct_permissions",
            field=models.ManyToManyField(blank=True, related_name="direct_users", to="accounts.permission"),
        ),
    ]
