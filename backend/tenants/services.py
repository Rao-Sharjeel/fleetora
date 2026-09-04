from tenants.models import Tenant


class TenantAlreadyExists(Exception):
    pass


def provision_tenant(schema_name: str, name: str) -> Tenant:
    """Creates a tenant's schema (auto-migrated via Tenant.save()). No Domain
    row anymore — tenants share one login domain now (user-based multi-tenancy,
    the tenant is resolved from the logged-in user's own `tenant` FK, not from
    hostname). Shared by the provision_tenant management command and the super
    admin TenantViewSet — one place owns this logic."""
    if Tenant.objects.filter(schema_name=schema_name).exists():
        raise TenantAlreadyExists(f"Tenant with schema_name '{schema_name}' already exists.")

    return Tenant.objects.create(schema_name=schema_name, name=name)
