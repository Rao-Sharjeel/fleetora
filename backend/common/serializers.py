import base64
import binascii
import uuid

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
