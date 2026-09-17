"""
Keeping the Permission table and each tenant's default roles in step with the
catalog. Takes model classes as arguments so the same code runs inside a data
migration (historical models) and at runtime (real ones).
"""

from accounts.permissions_catalog import (
    ALL_PERMISSIONS,
    PERMISSION_GROUP_OF,
    SYSTEM_ROLES,
    expand_permissions,
)


def sync_permissions(Permission) -> None:
    """Make the Permission table match the catalog. Codenames that left the
    catalog are deleted, which also drops them from every role and user."""
    existing = {p.codename: p for p in Permission.objects.all()}
    for codename, label in ALL_PERMISSIONS.items():
        group = PERMISSION_GROUP_OF[codename]
        current = existing.pop(codename, None)
        if current is None:
            Permission.objects.create(codename=codename, label=label, group=group)
        elif (current.label, current.group) != (label, group):
            current.label, current.group = label, group
            current.save(update_fields=["label", "group"])
    if existing:
        Permission.objects.filter(codename__in=list(existing)).delete()


def ensure_system_roles(Role, Permission, tenant_id) -> dict:
    """Create any default roles this tenant doesn't have yet. Never touches a
    role that already exists — an admin may have changed it on purpose."""
    roles = {}
    for key, spec in SYSTEM_ROLES.items():
        role = Role.objects.filter(tenant_id=tenant_id, name=spec["name"]).first()
        if role is None:
            role = Role.objects.create(
                tenant_id=tenant_id, name=spec["name"], description=spec["description"], is_system=True
            )
            role.permissions.set(
                Permission.objects.filter(codename__in=expand_permissions(spec["permissions"]))
            )
        roles[key] = role
    return roles
