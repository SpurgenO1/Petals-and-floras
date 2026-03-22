from rest_framework import serializers


class ProductSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField(max_length=100)
    price = serializers.IntegerField()
    old_price = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True)


class OrderSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=15)
    address = serializers.CharField()
    city = serializers.CharField(max_length=50)
    pincode = serializers.CharField(max_length=10)
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    status = serializers.CharField(required=False, default="Pending")
    total_amount = serializers.IntegerField(required=False, min_value=0)
    payment_order_id = serializers.CharField(required=False, allow_blank=True)
    payment_id = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Invalid phone number")
        return value
