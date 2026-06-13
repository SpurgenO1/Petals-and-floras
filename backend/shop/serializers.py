from rest_framework import serializers
import re
from django.conf import settings
from django.contrib.auth.models import User
from .delivery import get_delivery_status_label, get_slot_choices, get_slot_label
from .models import Feedback, Order, Product


class ProductSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=100)
    price = serializers.IntegerField(min_value=0, max_value=999999999)
    flower_price = serializers.IntegerField(required=False, min_value=0, max_value=999999999)
    bouquet_price = serializers.IntegerField(required=False, min_value=0, max_value=999999999)
    old_price = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=999999999)
    description = serializers.CharField(max_length=1000)
    category = serializers.CharField(required=False, allow_blank=True, max_length=50)
    
    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product name cannot be empty")
        if len(value) < 2:
            raise serializers.ValidationError("Product name too short")
        return value.strip()
    
    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product description cannot be empty")
        return value.strip()


class OrderSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=15)
    address = serializers.CharField(max_length=500)
    city = serializers.CharField(max_length=50, required=False, default="")
    pincode = serializers.CharField(max_length=10, required=False, default="")
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    status = serializers.CharField(required=False, default="Pending", max_length=20)
    total_amount = serializers.IntegerField(required=False, min_value=0, max_value=999999999)
    payment_method = serializers.CharField(required=False, default="COD", max_length=20)
    payment_status = serializers.CharField(required=False, default="UNPAID", max_length=20)
    payment_order_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    payment_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    payment_signature = serializers.CharField(required=False, allow_blank=True, max_length=255)
    delivery_date = serializers.DateField()
    delivery_slot = serializers.ChoiceField(choices=[choice[0] for choice in get_slot_choices()], write_only=False)
    same_day_delivery = serializers.BooleanField(required=False, default=False)
    gift_message = serializers.CharField(required=False, allow_blank=True, max_length=300)
    occasion = serializers.ChoiceField(required=False, allow_blank=True, choices=[choice[0] for choice in Order.OCCASION_CHOICES])

    def validate_name(self, value):
        if not value.strip() or len(value) < 2:
            raise serializers.ValidationError("Invalid customer name")
        if len(value) > 100:
            raise serializers.ValidationError("Name too long")
        return value.strip()

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone must be exactly 10 digits")
        return value

    def validate_address(self, value):
        if not value.strip() or len(value) < 5:
            raise serializers.ValidationError("Address too short")
        if len(value) > 500:
            raise serializers.ValidationError("Address too long")
        return value.strip()

    def validate_pincode(self, value):
        if value and (not value.isdigit() or len(value) != 6):
            raise serializers.ValidationError("Pincode must be 6 digits")
        return value

    def validate_items(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("Items list cannot be empty")
        if len(value) > 100:
            raise serializers.ValidationError("Too many items in order")
        return value

    def validate_gift_message(self, value):
        value = value.strip()
        if len(value) > 300:
            raise serializers.ValidationError("Gift message is too long")
        return value


class PaymentOrderCreateSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=100, max_value=100000000)


class PaymentVerificationSerializer(OrderSerializer):
    payment_method = serializers.ChoiceField(choices=["ONLINE"])
    payment_status = serializers.ChoiceField(choices=["PAID"])
    payment_order_id = serializers.CharField(max_length=100)
    payment_id = serializers.CharField(max_length=100)
    payment_signature = serializers.CharField(max_length=255)


class OrderHistorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    tracking_events = serializers.SerializerMethodField()
    delivery_slot_label = serializers.SerializerMethodField()
    delivery_status_label = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "name",
            "phone",
            "city",
            "pincode",
            "status",
            "total_amount",
            "payment_order_id",
            "payment_id",
            "mongo_order_id",
            "created_at",
            "items",
            "item_count",
            "delivery_date",
            "delivery_slot",
            "delivery_slot_label",
            "same_day_delivery",
            "gift_message",
            "occasion",
            "delivery_status",
            "delivery_status_label",
            "delivery_status_updated_at",
            "tracking_events",
        )

    def get_item_count(self, obj):
        return sum(int(item.get("qty", 1)) for item in obj.items if isinstance(item, dict))

    def get_tracking_events(self, obj):
        events = getattr(obj, "tracking_events", None)
        if hasattr(events, "all"):
            return [
                {
                    "status": event.status,
                    "label": get_delivery_status_label(event.status) or event.title,
                    "title": event.title,
                    "description": event.description,
                    "created_at": event.created_at,
                }
                for event in events.all()
            ]
        return []

    def get_delivery_slot_label(self, obj):
        return get_slot_label(obj.delivery_slot)

    def get_delivery_status_label(self, obj):
        return get_delivery_status_label(obj.delivery_status)


class FeedbackCreateSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=Feedback.TARGET_CHOICES)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(max_length=120)
    message = serializers.CharField(max_length=1000)

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title is too short")
        return value

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Feedback message is too short")
        return value

    def validate(self, attrs):
        target_type = attrs.get("target_type")
        product_id = attrs.get("product_id")

        if target_type == Feedback.TARGET_FLOWER:
            if not product_id:
                raise serializers.ValidationError({"product_id": "Select a flower product for flower feedback"})

            product = Product.objects.filter(id=product_id).first()
            if product is None:
                raise serializers.ValidationError({"product_id": "Selected flower product does not exist"})
            attrs["product"] = product
        else:
            attrs["product"] = None

        return attrs


class FeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = (
            "id",
            "target_type",
            "rating",
            "title",
            "message",
            "status",
            "created_at",
            "user_name",
            "product_name",
        )

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name().strip() or obj.user.username
        return "Guest"

    def get_product_name(self, obj):
        return obj.product.name if obj.product else ""


class AuthUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    name = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=6, max_length=128, write_only=True)

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Name is too short")
        return value

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists")

        domain = email.rsplit("@", 1)[-1]
        if domain in {"localhost", "example.com", "test.com", "invalid"}:
            raise serializers.ValidationError("Enter a real email address")

        return email


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=False, allow_blank=True, max_length=254)
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    identifier = serializers.CharField(required=False, allow_blank=True, max_length=254)
    password = serializers.CharField(max_length=128, write_only=True)

    def validate(self, attrs):
        identifier = (
            attrs.get("identifier")
            or attrs.get("email")
            or attrs.get("username")
            or ""
        ).strip()

        if not identifier:
            raise serializers.ValidationError({"email": "Enter your email or username"})

        attrs["identifier"] = identifier
        return attrs
