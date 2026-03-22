import razorpay
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .mongo import get_orders_collection, get_products_collection
from .models import Order
from .serializers import OrderSerializer, ProductSerializer


def validate_order(data):
    required_fields = ["name", "phone", "address"]
    for field in required_fields:
        if not str(data.get(field, "")).strip():
            return f"{field} is required"

    if len(str(data.get("phone", "")).strip()) != 10:
        return "Invalid phone number"

    items = data.get("items", [])
    if not isinstance(items, list) or len(items) == 0:
        return "Cart is empty"

    return None


def calculate_total(items):
    total = 0
    for item in items:
        price = int(item.get("price", 0))
        qty = int(item.get("qty", 1))
        total += price * qty
    return total


@api_view(["GET"])
def get_products(request):
    collection = get_products_collection()
    products = []
    for item in collection.find({}, {"name": 1, "price": 1, "old_price": 1, "description": 1, "category": 1}):
        products.append(
            {
                "id": str(item.get("_id")),
                "name": item.get("name", ""),
                "price": int(item.get("price", 0)),
                "old_price": item.get("old_price"),
                "description": item.get("description", ""),
                "category": item.get("category", "other"),
            }
        )

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["POST"])
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

    order_obj = Order.objects.create(
        name=payload["name"],
        phone=payload["phone"],
        address=payload["address"],
        city=payload.get("city", ""),
        pincode=payload.get("pincode", ""),
        items=payload["items"],
        status=payload["status"],
        total_amount=payload["total_amount"],
        payment_order_id=payload.get("payment_order_id", ""),
        payment_id=payload.get("payment_id", ""),
    )

    orders = get_orders_collection()
    insert_result = orders.insert_one(payload)

    return Response(
        {
            "message": "Order placed",
            "order_id": str(insert_result.inserted_id),
            "admin_order_id": order_obj.id,
            "status": order_obj.status,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def create_payment(request):
    amount = int(request.data.get("amount", 0))
    if amount <= 0:
        return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return Response(
            {"error": "Razorpay keys are not configured on server"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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
            "id": payment_order["id"],
            "amount": payment_order["amount"],
            "currency": payment_order["currency"],
            "key": settings.RAZORPAY_KEY_ID,
        },
        status=status.HTTP_201_CREATED,
    )
