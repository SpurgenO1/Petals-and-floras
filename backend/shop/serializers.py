from rest_framework import serializers
import re


class ProductSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=100)
    price = serializers.IntegerField(min_value=0, max_value=999999999)
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
