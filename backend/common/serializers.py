import base64
import binascii
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from PIL import Image
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

    # Pillow opens far more than this (GIF, WebP, BMP, TIFF...), so without an
    # explicit allowlist any of them would be stored and then served to a
    # browser. Photo formats only, and no animation.
    ALLOWED_FORMATS = {"JPEG", "PNG"}
    _EXTENSIONS = {"JPEG": "jpg", "PNG": "png"}

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

        file_object = super().to_internal_value(data)
        self._reject_unsupported_format(file_object)
        return file_object

    def _reject_unsupported_format(self, file_object) -> None:
        """Checks the decoded bytes, not the declared MIME type or file
        extension — both are client-supplied and can say anything."""
        image_format = getattr(getattr(file_object, "image", None), "format", None)
        if image_format is None:
            file_object.seek(0)
            try:
                with Image.open(file_object) as image:
                    image_format = image.format
            except Exception as exc:  # noqa: BLE001 - anything unreadable is invalid
                raise serializers.ValidationError("Not a readable image file.") from exc
            finally:
                file_object.seek(0)

        if image_format not in self.ALLOWED_FORMATS:
            raise serializers.ValidationError(
                f"{image_format or 'This'} images aren't supported — use a JPG or PNG."
            )
        # A correct extension matters because the stored file is served straight
        # back to the browser, which trusts it over the bytes.
        base_name = file_object.name.rsplit(".", 1)[0] if "." in file_object.name else file_object.name
        file_object.name = f"{base_name}.{self._EXTENSIONS[image_format]}"


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
