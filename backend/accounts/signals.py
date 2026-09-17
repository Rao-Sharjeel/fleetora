from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver


@receiver(post_migrate)
def sync_permission_catalog(sender, app_config=None, **kwargs):
    """Keep the Permission table in step with the catalog after every migrate,
    so adding a permission never needs its own migration."""
    if app_config is None or app_config.label != "accounts":
        return
    from django.db import connection

    # migrate_schemas fires post_migrate once per schema; Permission lives in
    # public, so only act there.
    if getattr(connection, "schema_name", "public") != "public":
        return
    from accounts.models import Permission
    from accounts.rbac_setup import sync_permissions

    # Migrating backwards past the RBAC migration drops the table before this
    # runs.
    if Permission._meta.db_table not in connection.introspection.table_names():
        return

    sync_permissions(Permission)


@receiver(post_save, sender="tenants.Tenant")
def seed_roles_for_new_tenant(sender, instance, created, **kwargs):
    """Every new company starts with the default roles, whichever path created
    it (platform console, provision_tenant, create_tenant)."""
    if not created:
        return
    from accounts.models import Permission, Role
    from accounts.rbac_setup import ensure_system_roles, sync_permissions

    if not Permission.objects.exists():
        sync_permissions(Permission)
    ensure_system_roles(Role, Permission, instance.id)
