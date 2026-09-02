from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from tenants.models import SuperAdmin


class SuperAdminJWTAuthentication(JWTAuthentication):
    """
    JWT auth scoped to SuperAdmin instead of AUTH_USER_MODEL (accounts.User,
    which is tenant-scoped and has no table at all in the public schema this
    runs in). Reads a `superadmin_id` claim rather than the default `user_id`
    claim — deliberately a different key, so a tenant user's access token and
    a super admin's can never be confused for one another even if somehow
    presented to the wrong endpoint. Mirrors accounts.authentication.KioskDeviceAuthentication's
    shape: a second, independent principal type alongside the normal user auth.
    """

    def get_user(self, validated_token):
        try:
            superadmin_id = validated_token["superadmin_id"]
        except KeyError:
            raise InvalidToken("Token contains no superadmin_id claim.")

        try:
            return SuperAdmin.objects.get(id=superadmin_id, active=True)
        except SuperAdmin.DoesNotExist:
            raise InvalidToken("Super admin not found or inactive.")
