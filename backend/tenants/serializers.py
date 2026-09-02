from django_tenants.utils import schema_context
from rest_framework import serializers

from tenants.models import Domain, Tenant
from tenants.services import TenantAlreadyExists, provision_tenant


class TenantSerializer(serializers.ModelSerializer):
    domain = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = ["id", "schema_name", "name", "domain", "created_at"]
        read_only_fields = fields

    def get_domain(self, obj: Tenant) -> str | None:
        primary = obj.get_primary_domain()
        return primary.domain if primary else None


class TenantCreateSerializer(serializers.Serializer):
    """Provisions a tenant and its first admin user in one step — a brand-new
    tenant with zero users is otherwise a dead end. adminEmail/adminPassword
    are write-only: the caller chose them, so there's nothing to echo back."""

    schema_name = serializers.SlugField(max_length=63)
    name = serializers.CharField(max_length=120)
    domain = serializers.CharField(max_length=253)
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True, min_length=8)

    def validate_domain(self, value: str) -> str:
        if Domain.objects.filter(domain=value).exists():
            raise serializers.ValidationError("This domain is already in use.")
        return value

    def create(self, validated_data):
        try:
            tenant = provision_tenant(
                validated_data["schema_name"], validated_data["name"], validated_data["domain"]
            )
        except TenantAlreadyExists as exc:
            raise serializers.ValidationError({"schema_name": str(exc)}) from exc

        # accounts.User is a TENANT_APP model — only reachable by switching into
        # the new tenant's own schema, same pattern seed_dev_data already uses.
        with schema_context(tenant.schema_name):
            from accounts.models import User

            admin = User(
                username=validated_data["admin_email"],
                email=validated_data["admin_email"],
                role=User.Role.ADMIN,
                active=True,
            )
            admin.set_password(validated_data["admin_password"])
            admin.save()

        return tenant
