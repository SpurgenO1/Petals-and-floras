import razorpay
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from pymongo.errors import PyMongoError
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
import re

from .mongo import get_orders_collection, get_products_collection
from .models import Order, Product
from .serializers import OrderSerializer, ProductSerializer
from .throttles import OrderRateThrottle, PaymentRateThrottle, ProductRateThrottle


def validate_order(data):
    required_fields = ["name", "phone", "address"]
    for field in required_fields:
        value = str(data.get(field, "")).strip()
        if not value or len(value) == 0:
            return f"{field} is required"
        if len(value) > 500:
            return f"{field} exceeds maximum length"

    phone = str(data.get("phone", "")).strip()
    if not phone.isdigit() or len(phone) != 10:
        return "Invalid phone number. Phone must be 10 digits."

    pincode = str(data.get("pincode", "")).strip()
    if pincode and (not pincode.isdigit() or len(pincode) != 6):
        return "Invalid pincode. Must be 6 digits."

    items = data.get("items", [])
    if not isinstance(items, list) or len(items) == 0:
        return "Cart is empty"
    
    if len(items) > 100:
        return "Too many items in cart"

    for item in items:
        if not isinstance(item, dict):
            return "Invalid item format"
        if "price" not in item or "qty" not in item or "id" not in item:
            return "Item missing required fields"
        try:
            price = int(item.get("price", 0))
            qty = int(item.get("qty", 1))
            if price < 0 or qty < 1 or qty > 999:
                return "Invalid item price or quantity"
        except (ValueError, TypeError):
            return "Invalid item price or quantity format"

    return None


def sanitize_string(value, max_length=500):
    """Sanitize string input to prevent injection attacks."""
    if not isinstance(value, str):
        return ""
    # Remove potentially dangerous characters but allow common text
    sanitized = re.sub(r'[<>"\']', '', value.strip())
    return sanitized[:max_length]


def calculate_total(items):
    total = 0
    for item in items:
        price = int(item.get("price", 0))
        qty = int(item.get("qty", 1))
        total += price * qty
    return total


def normalize_items(items):
    normalized = []
    for item in items:
        price = int(item.get("price", 0))
        qty = int(item.get("qty", 1))
        normalized.append(
            {
                "product_id": str(item.get("id", "")),
                "name": item.get("name", ""),
                "category": item.get("category", "Floral"),
                "price": price,
                "qty": qty,
                "line_total": price * qty,
            }
        )
    return normalized


def build_mongo_order(payload, order_obj):
    payment_method = str(payload.get("payment_method", "COD")).upper()
    if payment_method not in ["COD", "ONLINE"]:
        payment_method = "COD"
        
    payment_status = str(payload.get("payment_status", "UNPAID")).upper()
    if payment_status not in ["PAID", "UNPAID"]:
        payment_status = "UNPAID"

    if payload.get("payment_id"):
        payment_method = "ONLINE"
        payment_status = "PAID"

    return {
        "admin_order_id": order_obj.id,
        "source": "checkout",
        "created_at": timezone.now(),
        "customer": {
            "name": sanitize_string(payload["name"], 100),
            "phone": sanitize_string(payload["phone"], 15),
            "address": sanitize_string(payload["address"], 500),
            "city": sanitize_string(payload.get("city", ""), 50),
            "pincode": sanitize_string(payload.get("pincode", ""), 10),
        },
        "items": normalize_items(payload["items"]),
        "total_amount": payload["total_amount"],
        "order_status": payload["status"],
        "payment": {
            "method": payment_method,
            "status": payment_status,
            "razorpay_order_id": sanitize_string(payload.get("payment_order_id", ""), 100),
            "razorpay_payment_id": sanitize_string(payload.get("payment_id", ""), 100),
            "amount_paid": payload["total_amount"] if payment_status == "PAID" else 0,
        },
    }


@api_view(["GET"])
@throttle_classes([ProductRateThrottle])
def get_products(request):
    products = [
        {
            "id": str(item.id),
            "name": sanitize_string(item.name, 100),
            "price": int(item.price),
            "old_price": None,
            "description": sanitize_string(item.description, 500),
            "category": "Floral",
        }
        for item in Product.objects.all().order_by("id")[:200]
    ]

    if not products:
        try:
            collection = get_products_collection()
            for item in collection.find({}, {"name": 1, "price": 1, "old_price": 1, "description": 1, "category": 1}).limit(200):
                products.append(
                    {
                        "id": str(item.get("_id")),
                        "name": sanitize_string(item.get("name", ""), 100),
                        "price": int(item.get("price", 0)),
                        "old_price": item.get("old_price"),
                        "description": sanitize_string(item.get("description", ""), 500),
                        "category": sanitize_string(item.get("category", "Floral"), 50),
                    }
                )
        except PyMongoError:
            return Response({"error": "Database error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@throttle_classes([OrderRateThrottle])
def create_order(request):
    error = validate_order(request.data)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    serializer = OrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = serializer.validated_data
    payload["status"] = payload.get("status", Order.STATUS_PENDING)
    payload["total_amount"] = calculate_total(payload.get("items", []))
    payload["payment_method"] = payload.get("payment_method", "COD").upper()
    payload["payment_status"] = payload.get("payment_status", "UNPAID").upper()

    if payload.get("payment_id"):
        payload["status"] = Order.STATUS_PAID
        payload["payment_method"] = "ONLINE"
        payload["payment_status"] = "PAID"

    try:
        order_obj = Order.objects.create(
            name=sanitize_string(payload["name"], 100),
            phone=sanitize_string(payload["phone"], 15),
            address=sanitize_string(payload["address"], 500),
            city=sanitize_string(payload.get("city", ""), 50),
            pincode=sanitize_string(payload.get("pincode", ""), 10),
            items=payload["items"],
            status=payload["status"],
            total_amount=payload["total_amount"],
            payment_order_id=sanitize_string(payload.get("payment_order_id", ""), 100),
            payment_id=sanitize_string(payload.get("payment_id", ""), 100),
        )
    except Exception as e:
        return Response({"error": "Order creation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    mongo_order = build_mongo_order(payload, order_obj)
    mongo_order_id = None
    mongo_sync_warning = ""

    try:
        orders = get_orders_collection()
        insert_result = orders.insert_one(mongo_order)
        mongo_order_id = str(insert_result.inserted_id)
    except PyMongoError:
        mongo_sync_warning = "Order saved locally, but MongoDB sync failed."

    return Response(
        {
            "message": "Order placed successfully",
            "order_id": mongo_order_id,
            "admin_order_id": order_obj.id,
            "status": order_obj.status,
            "payment_method": mongo_order["payment"]["method"],
            "payment_status": mongo_order["payment"]["status"],
            "warning": mongo_sync_warning,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@throttle_classes([PaymentRateThrottle])
def create_payment(request):
    try:
        amount = int(request.data.get("amount", 0))
    except (ValueError, TypeError):
        return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)
    
    min_amount = 1  # 1 paise
    max_amount = 100000000  # 1 crore rupees
    
    if amount < min_amount or amount > max_amount:
        return Response(
            {"error": f"Amount must be between {min_amount} and {max_amount}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return Response(
            {
                "error": "Payment service not configured. Contact support."
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        payment_order = client.order.create(
            {
                "amount": amount,
                "currency": "INR",
                "payment_capture": 1,
            }
        )
        return Response(
            {
                "id": payment_order.get("id"),
                "amount": payment_order.get("amount"),
                "currency": payment_order.get("currency"),
                "key": settings.RAZORPAY_KEY_ID,
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response(
            {"error": "Payment processing failed"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


def csrf_failure(request, reason=""):
    """Handle CSRF failures."""
    return Response(
        {"error": "CSRF validation failed"},
        status=status.HTTP_403_FORBIDDEN,
    )
