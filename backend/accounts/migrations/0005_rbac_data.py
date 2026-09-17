from django.db import migrations

from accounts.rbac_setup import ensure_system_roles, sync_permissions


def forwards(apps, schema_editor):
    """Move everyone from the old fixed role onto the new model without
    changing what they can reach:

    admin                              -> admin user type
    fleet_manager / management /
    gate_guard                         -> staff, on the matching default role
    driver (or anything else)          -> staff with no role. Drivers never
                                          log in, so this grants nothing.
    """
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")
    User = apps.get_model("accounts", "User")
    Tenant = apps.get_model("tenants", "Tenant")

    sync_permissions(Permission)
    roles_by_tenant = {
        tenant.id: ensure_system_roles(Role, Permission, tenant.id)
        for tenant in Tenant.objects.all()
    }

    for user in User.objects.all():
        if user.legacy_role == "admin":
            user.user_type = "admin"
            user.role = None
        else:
            user.user_type = "staff"
            user.role = roles_by_tenant.get(user.tenant_id, {}).get(user.legacy_role)
        user.save(update_fields=["user_type", "role"])


def backwards(apps, schema_editor):
    # legacy_role is never modified going forward, so there's nothing to
    # restore; reversing 0004 drops the new tables and renames it back.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_rbac_schema"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
