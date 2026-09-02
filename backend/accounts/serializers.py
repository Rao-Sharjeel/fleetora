from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User


class FleetoraTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embeds role/name in the JWT itself, mirroring what the mock
    use-session.ts store used to just hold client-side with no real login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.name
        return token


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "active"]


class UserManageSerializer(serializers.ModelSerializer):
    """Read/write surface for the Users & Permissions screen. The FE's AppUser
    type is exactly {id, name, email, role, active} — `username` is an internal
    detail we set equal to `email` on create, so /auth/login/ (which matches on
    `username`) keeps working unchanged, honoring the login page's own
    "Username or email" label. `name` isn't a real column (see User.name), so
    it's written into `first_name` here. `name` must be declared explicitly
    (not left to ModelSerializer's auto-introspection) — since it's a model
    @property with no setter, auto-introspection would infer it as
    ReadOnlyField and silently drop it from validated_data on write."""

    name = serializers.CharField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "active", "password"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A password is required to create a user."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data.get("name", ""),
            role=validated_data["role"],
            active=validated_data.get("active", True),
        )
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        name = validated_data.pop("name", None)
        if name is not None:
            instance.first_name = name
        for field in ("email", "role", "active"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        if password:
            instance.set_password(password)
        instance.save()
        return instance
