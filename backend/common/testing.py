"""
Shared base for tests that need a real tenant schema.

django-tenants resolves the tenant from the request host (TenantMainMiddleware)
and our JWT auth then switches to the user's own tenant. Tests that bypass JWT
with force_authenticate skip that second step, so requests must carry the
tenant's host or their queries land in the public schema, where tenant tables
don't exist.
"""

from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient

from accounts.models import User


class TenantAPITestCase(FastTenantTestCase):
    @classmethod
    def get_test_schema_name(cls):
        return "apitest"

    @classmethod
    def get_test_tenant_domain(cls):
        return "apitest.localhost"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "API Test Co"

    def setUp(self):
        super().setUp()
        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain())

    def make_user(self, username: str, **fields) -> User:
        fields.setdefault("email", f"{username}@example.test")
        fields.setdefault("user_type", User.UserType.ADMIN)
        return User.objects.create_user(username=username, tenant=self.tenant, password="pw-123456", **fields)

    def as_user(self, user: User) -> APIClient:
        self.client.force_authenticate(user=user)
        return self.client
