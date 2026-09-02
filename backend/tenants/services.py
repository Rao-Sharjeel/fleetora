from tenants.models import Domain, Tenant


class TenantAlreadyExists(Exception):
    pass


def provision_tenant(schema_name: str, name: str, domain: str) -> Tenant:
    """Creates a tenant's schema (auto-migrated via Tenant.save()) and a Domain
    pointing at it. Shared by the provision_tenant management command and the
    super admin TenantViewSet — one place owns this logic."""
    if Tenant.objects.filter(schema_name=schema_name).exists():
        raise TenantAlreadyExists(f"Tenant with schema_name '{schema_name}' already exists.")

    tenant = Tenant.objects.create(schema_name=schema_name, name=name)
    Domain.objects.create(domain=domain, tenant=tenant, is_primary=True)
    return tenant
