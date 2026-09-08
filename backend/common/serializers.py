import base64
import binascii
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from rest_framework import serializers

from common.models import FleetSettings


class FleetSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetSettings
        fields = ["due_soon_km", "urgent_km"]


class Base64ImageField(serializers.ImageField):
    """Accepts a data URL (data:image/jpeg;base64,...) or a bare base64 string
    in place of a multipart file upload, so a photo travels in the same
    camelCase JSON body as every other field — no separate multipart parser
    needed anywhere in the API. Mirrors ReadOdometerSerializer's base64
    handling in fleet/serializers.py, generalized into a reusable field."""

    def to_internal_value(self, data):
        if isinstance(data, str):
            content_type = "image/jpeg"
            if "," in data and data.strip().lower().startswith("data:"):
                header, data = data.split(",", 1)
                content_type = header.removeprefix("data:").split(";")[0] or content_type
            try:
                decoded = base64.b64decode(data, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise serializers.ValidationError("Not valid base64 image data.") from exc
            ext = content_type.split("/")[-1] or "jpg"
            data = ContentFile(decoded, name=f"{uuid.uuid4()}.{ext}")
        return super().to_internal_value(data)


class SafePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField, but safe against a UUID-pk model being handed an
    empty string. An unselected optional <select> in the frontend submits ""
    rather than omitting the field — Django's UUIDField.to_python() rejects
    that with its own ValidationError, which DRF's PrimaryKeyRelatedField
    doesn't catch (it only catches TypeError/ValueError), so it was reaching
    the client as an unhandled 500 instead of a clean 400 or a no-op. "" is
    now treated the same as not selecting anything: None when the field
    allows null, otherwise a normal "this field is required" validation error."""

    def to_internal_value(self, data):
        if data == "":
            if self.allow_null:
                return None
            self.fail("does_not_exist", pk_value=data)
        try:
            return super().to_internal_value(data)
        except DjangoValidationError:
            self.fail("does_not_exist", pk_value=data)
