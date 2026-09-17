from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import KioskDevice, Permission, Role, User
from accounts.permissions_catalog import ALL_PERMISSIONS, expand_permissions


class FleetoraTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embeds the user type and name in the JWT. Permissions deliberately stay
    out of it: they change whenever an admin edits a role, and a token would
    keep the stale set until it expired. The app reads them from /auth/me/."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_type"] = user.user_type
        token["name"] = user.name
        return token


class UserSerializer(serializers.ModelSerializer):
    """/auth/me/ — who's logged in and everything they're allowed to do."""

    name = serializers.CharField(read_only=True)
    role_id = serializers.UUIDField(read_only=True, allow_null=True)
    role_name = serializers.CharField(source="role.name", read_only=True, default=None)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "user_type", "role_id", "role_name", "permissions", "active"]

    def get_permissions(self, user):
        return sorted(user.get_effective_permissions())


class CodenameListField(serializers.ListField):
    """A list of permission codenames, validated against the catalog."""

    child = serializers.CharField()

    def to_internal_value(self, data):
        codes = super().to_internal_value(data)
        unknown = sorted(set(codes) - set(ALL_PERMISSIONS))
        if unknown:
            raise serializers.ValidationError(f"Unknown permissions: {', '.join(unknown)}")
        return sorted(set(codes))

    def to_representation(self, data):
        # Reads come straight off the M2M manager.
        if hasattr(data, "values_list"):
            return sorted(data.values_list("codename", flat=True))
        return sorted(data)


class UserManageSerializer(serializers.ModelSerializer):
    """Read/write surface for the Users screen (admin-only). `username` is an
    internal detail set equal to `email`, so /auth/login/ (which matches on
    `username`) keeps working with the login page's "Username or email"
    label. `name` isn't a real column (see User.name) — it's written into
    `first_name`, and must be declared explicitly or ModelSerializer would
    infer it as read-only and drop it on write.

    Access: `user_type` admin gets everything and carries no role or direct
    permissions. Staff get their one role plus `direct_permissions`, which only
    add — `effective_permissions` is the result.
    """

    name = serializers.CharField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    role_id = serializers.PrimaryKeyRelatedField(
        source="role", queryset=Role.objects.none(), required=False, allow_null=True
    )
    role_name = serializers.CharField(source="role.name", read_only=True, default=None)
    direct_permissions = CodenameListField(required=False)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "user_type", "role_id", "role_name",
            "direct_permissions", "effective_permissions", "active", "password",
        ]
        read_only_fields = ["id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            # Only this tenant's roles are assignable.
            self.fields["role_id"].queryset = Role.objects.filter(tenant=request.user.tenant)

    def get_effective_permissions(self, user):
        return sorted(user.get_effective_permissions())

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A password is required to create a user."})

        user_type = attrs.get("user_type", getattr(self.instance, "user_type", User.UserType.STAFF))
        if user_type == User.UserType.ADMIN:
            # Admins already have everything; a role or extra permissions on
            # an admin would only mislead whoever reads the record.
            attrs["role"] = None
            attrs["direct_permissions"] = []

        request = self.context.get("request")
        if self.instance is not None and request is not None and self.instance.pk == request.user.pk:
            if user_type != User.UserType.ADMIN:
                raise serializers.ValidationError({"user_type": "You can't remove your own admin access."})
            if attrs.get("active") is False:
                raise serializers.ValidationError({"active": "You can't deactivate your own account."})
        return attrs

    def _apply_direct_permissions(self, user, codes):
        if codes is not None:
            user.direct_permissions.set(Permission.objects.filter(codename__in=codes))
            user._effective_permissions = None

    def create(self, validated_data):
        password = validated_data.pop("password")
        codes = validated_data.pop("direct_permissions", None)
        user = User(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data.get("name", ""),
            user_type=validated_data.get("user_type", User.UserType.STAFF),
            role=validated_data.get("role"),
            active=validated_data.get("active", True),
            tenant=validated_data["tenant"],  # passed via serializer.save(tenant=...) — see UserViewSet.perform_create
        )
        user.set_password(password)
        user.save()
        self._apply_direct_permissions(user, codes)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        name = validated_data.pop("name", None)
        codes = validated_data.pop("direct_permissions", None)
        if name is not None:
            instance.first_name = name
        for field in ("email", "user_type", "role", "active"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        if "email" in validated_data:
            # username was set equal to email at creation (see create() above) —
            # keep them in sync so the user can still log in with their new email.
            instance.username = validated_data["email"]
        if password:
            instance.set_password(password)
        instance.save()
        instance._effective_permissions = None
        self._apply_direct_permissions(instance, codes)
        return instance


class RoleSerializer(serializers.ModelSerializer):
    permissions = CodenameListField(required=False)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions", "is_system", "user_count", "created_at", "updated_at"]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]

    def get_user_count(self, role):
        return role.users.count()

    def validate_name(self, value):
        value = value.strip()
        tenant = self.context["request"].user.tenant
        clash = Role.objects.filter(tenant=tenant, name__iexact=value)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return value

    def _set_permissions(self, role, codes):
        if codes is not None:
            # Store the implied view permissions too, so the role reads the same
            # in every picker as what it actually grants.
            role.permissions.set(Permission.objects.filter(codename__in=expand_permissions(codes)))

    def create(self, validated_data):
        codes = validated_data.pop("permissions", None)
        role = Role.objects.create(**validated_data)
        self._set_permissions(role, codes)
        return role

    def update(self, instance, validated_data):
        codes = validated_data.pop("permissions", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        self._set_permissions(instance, codes)
        return instance


class KioskDeviceSerializer(serializers.ModelSerializer):
    claimed = serializers.BooleanField(read_only=True)

    """List/retrieve/update surface — deliberately excludes api_key. The plaintext
    key is only ever returned once, from KioskDeviceCreateSerializer's create()
    response; there's no way to recover it after that (see KioskDeviceCreateSerializer's
    docstring for why)."""

    class Meta:
        model = KioskDevice
        fields = [
            "id",
            "name",
            "app",
            "active",
            "claimed",
            "claimed_at",
            "device_label",
            "last_seen_at",
            "created_at",
        ]
        read_only_fields = ["id", "claimed", "claimed_at", "device_label", "last_seen_at", "created_at"]


class KioskDeviceCreateSerializer(serializers.ModelSerializer):
    """Used only for the create action. api_key has no rotate/regenerate mechanism
    on the model (editable=False, set once via default=generate_kiosk_key) — this
    response is the only time the raw key is ever visible. The admin UI must show
    it to the operator immediately and warn it won't be shown again."""

    class Meta:
        model = KioskDevice
        fields = ["id", "name", "app", "active", "api_key", "created_at"]
        read_only_fields = ["id", "api_key", "created_at"]
        extra_kwargs = {"app": {"required": True}}


class KioskClaimSerializer(serializers.Serializer):
    """A kiosk redeeming its key for the first and only time.

    The key names which app it is for and is claimable exactly once; the
    install that claims it generates the id and keeps it for good. Deliberately
    not a ModelSerializer — nothing here is editable, it is a handshake.
    """

    api_key = serializers.CharField()
    installation_id = serializers.CharField(max_length=64)
    app = serializers.ChoiceField(choices=KioskDevice.App.choices)
    device_label = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
