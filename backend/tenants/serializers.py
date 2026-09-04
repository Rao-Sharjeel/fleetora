from rest_framework import serializers

from tenants.models import Tenant
from tenants.services import TenantAlreadyExists, provision_tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "schema_name", "name", "created_at"]
        read_only_fields = fields


class TenantCreateSerializer(serializers.Serializer):
    """Provisions a tenant and its first admin user in one step — a brand-new
    tenant with zero users is otherwise a dead end. adminEmail/adminPassword
    are write-only: the caller chose them, so there's nothing to echo back."""

    schema_name = serializers.SlugField(max_length=63)
    name = serializers.CharField(max_length=120)
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True, min_length=8)

    def validate_admin_email(self, value: str) -> str:
        from accounts.models import User

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        try:
            tenant = provision_tenant(validated_data["schema_name"], validated_data["name"])
        except TenantAlreadyExists as exc:
            raise serializers.ValidationError({"schema_name": str(exc)}) from exc

        # accounts.User is a SHARED_APP model now (single platform-wide table,
        # tenant resolved via its own `tenant` FK) — no schema_context hop needed,
        # this already runs in the public schema where the table lives.
        from accounts.models import User

        admin = User(
            username=validated_data["admin_email"],
            email=validated_data["admin_email"],
            role=User.Role.ADMIN,
            active=True,
            tenant=tenant,
        )
        admin.set_password(validated_data["admin_password"])
        admin.save()

        return tenant
