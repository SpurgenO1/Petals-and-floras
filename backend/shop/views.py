import razorpay
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import Group, User
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum
from django.middleware.csrf import get_token
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect
from pymongo.errors import PyMongoError
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
import re

from .catalog import CATALOG_PRODUCTS
from .mongo import get_orders_collection, get_products_collection, sync_product_to_mongo
from .models import Feedback, Order, OrderHistory, Product
from .serializers import (
    AuthUserSerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
    LoginSerializer,
    OrderHistorySerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
)
from .throttles import OrderRateThrottle, PaymentRateThrottle, ProductRateThrottle
from .throttles import AuthLoginRateThrottle, AuthRegisterRateThrottle, AuthUserRateThrottle, FeedbackRateThrottle


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


def serialize_auth_user(user):
    serializer = AuthUserSerializer(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.get_full_name() or user.username,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )
    return serializer.data


def build_frontend_login_url(query_string=""):
    base_url = (settings.FRONTEND_BASE_URL or "").rstrip("/")
    login_url = f"{base_url}/login" if base_url else "/login"
    if query_string:
        return f"{login_url}?{query_string}"
    return login_url


def send_verification_email(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_path = f"/api/auth/verify-email/{uid}/{token}/"
    verification_url = request.build_absolute_uri(verify_path)

    context = {
        "name": user.get_full_name().strip() or user.username,
        "verification_url": verification_url,
    }
    subject = "Verify your Petals & Flora account"
    message = render_to_string("emails/verify_email.txt", context)

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def get_effective_user(request):
    if request.user.is_authenticated:
        return request.user

    if not settings.DEBUG:
        return None

    request_meta = getattr(request, "META", {}) or {}
    debug_email = str(
        request.headers.get("X-Debug-User-Email", "")
        or request_meta.get("HTTP_X_DEBUG_USER_EMAIL", "")
        or request_meta.get("X_DEBUG_USER_EMAIL", "")
    ).strip().lower()
    if not debug_email:
        return None

    return User.objects.filter(email__iexact=debug_email).first()


def get_staff_user(request):
    user = get_effective_user(request)
    if user is None:
        return None, Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    if not (user.is_staff or user.is_superuser):
        return None, Response({"error": "Administrator access required"}, status=status.HTTP_403_FORBIDDEN)
    return user, None


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


def serialize_product(product):
    return {
        "id": product.id,
        "name": product.name,
        "price": int(product.price),
        "description": product.description,
        "category": product.category or "",
    }


def serialize_order(order):
    return {
        "id": order.id,
        "customer_name": order.name,
        "phone": order.phone,
        "address": order.address,
        "city": order.city,
        "pincode": order.pincode,
        "status": order.status,
        "total_amount": int(order.total_amount),
        "items": order.items,
        "payment_order_id": order.payment_order_id,
        "payment_id": order.payment_id,
        "mongo_order_id": order.mongo_order_id,
        "created_at": order.created_at,
        "user_id": order.user_id,
        "user_email": order.user.email if order.user else "",
    }


def serialize_order_history(entry):
    return {
        "id": entry.id,
        "source_order_id": entry.source_order_id,
        "customer_name": entry.customer_name,
        "phone": entry.phone,
        "city": entry.city,
        "pincode": entry.pincode,
        "status": entry.status,
        "total_amount": int(entry.total_amount),
        "items": entry.items,
        "payment_order_id": entry.payment_order_id,
        "payment_id": entry.payment_id,
        "mongo_order_id": entry.mongo_order_id,
        "ordered_at": entry.ordered_at,
        "updated_at": entry.updated_at,
        "user_id": entry.user_id,
        "user_email": entry.user.email if entry.user else "",
    }


def serialize_feedback_admin(feedback):
    return {
        "id": feedback.id,
        "title": feedback.title,
        "message": feedback.message,
        "target_type": feedback.target_type,
        "rating": feedback.rating,
        "status": feedback.status,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at,
        "user_id": feedback.user_id,
        "user_email": feedback.user.email if feedback.user else "",
        "user_name": ((feedback.user.get_full_name().strip() or feedback.user.username) if feedback.user else "Guest"),
        "product_id": feedback.product_id,
        "product_name": feedback.product.name if feedback.product else "",
    }


def serialize_user_admin(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": user.get_full_name().strip() or user.username,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
        "groups": [{"id": group.id, "name": group.name} for group in user.groups.all().order_by("name")],
    }


def serialize_group(group):
    permissions = list(group.permissions.order_by("content_type__app_label", "codename"))
    return {
        "id": group.id,
        "name": group.name,
        "permissions": [
            {
                "id": permission.id,
                "name": permission.name,
                "codename": permission.codename,
                "app_label": permission.content_type.app_label,
            }
            for permission in permissions
        ],
        "user_count": group.user_set.count(),
    }


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
            "user_id": order_obj.user_id,
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
    django_products = list(Product.objects.all().order_by("id")[:200])
    for item in django_products:
        try:
            sync_product_to_mongo(item)
        except PyMongoError:
            break

    products = []
    product_map = {}

    for item in django_products:
        name = sanitize_string(item.name, 100)
        category = sanitize_string(item.category or "Floral", 50)
        dedupe_key = f"django::{item.id}"
        product_map[dedupe_key] = {
            "id": str(item.id),
            "name": name,
            "price": int(item.price),
            "old_price": None,
            "description": sanitize_string(item.description, 500),
            "category": category,
        }

    try:
        collection = get_products_collection()
        mongo_products = collection.find(
            {},
            {
                "django_product_id": 1,
                "name": 1,
                "price": 1,
                "old_price": 1,
                "description": 1,
                "category": 1,
                "updated_at": 1,
            },
        ).sort([("updated_at", -1), ("_id", -1)]).limit(500)

        for item in mongo_products:
            name = sanitize_string(item.get("name", ""), 100)
            category = sanitize_string(item.get("category", "Floral"), 50)
            mongo_identity = item.get("django_product_id") or item.get("_id")
            if item.get("django_product_id"):
                dedupe_key = f"django::{item['django_product_id']}"
            else:
                dedupe_key = f"mongo::{mongo_identity}"
            if not name:
                continue

            product_map[dedupe_key] = {
                "id": str(mongo_identity),
                "name": name,
                "price": int(item.get("price", 0)),
                "old_price": item.get("old_price"),
                "description": sanitize_string(item.get("description", ""), 500),
                "category": category,
            }
    except PyMongoError:
        pass

    products = list(product_map.values())

    if not products:
        products = [
            {
                "id": item["id"],
                "name": sanitize_string(item["name"], 100),
                "price": int(item["price"]),
                "old_price": item["old_price"],
                "description": sanitize_string(item["description"], 500),
                "category": sanitize_string(item["category"], 50),
            }
            for item in CATALOG_PRODUCTS
        ]

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def get_current_user(request):
    user = get_effective_user(request)
    if user is None:
        return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(serialize_auth_user(user))


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def get_csrf_token(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def get_order_history(request):
    user = get_effective_user(request)
    if user is None:
        return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    orders = Order.objects.filter(user=user).order_by("-created_at")
    serializer = OrderHistorySerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def get_admin_overview(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    recent_orders = [
        {
            "id": order.id,
            "customer_name": order.name,
            "status": order.status,
            "total_amount": int(order.total_amount),
            "created_at": order.created_at,
            "user_email": order.user.email if order.user else "",
        }
        for order in Order.objects.select_related("user").order_by("-created_at")[:6]
    ]

    recent_feedback = [
        {
            "id": feedback.id,
            "title": feedback.title,
            "rating": feedback.rating,
            "status": feedback.status,
            "target_type": feedback.target_type,
            "created_at": feedback.created_at,
            "user_name": ((feedback.user.get_full_name().strip() or feedback.user.username) if feedback.user else "Guest"),
        }
        for feedback in Feedback.objects.select_related("user").order_by("-created_at")[:6]
    ]

    recent_products = [
        {
            "id": product.id,
            "name": product.name,
            "category": product.category or "Floral",
            "price": int(product.price),
        }
        for product in Product.objects.order_by("-id")[:6]
    ]

    recent_users = [
        {
            "id": admin_user.id,
            "name": admin_user.get_full_name().strip() or admin_user.username,
            "email": admin_user.email,
            "is_staff": admin_user.is_staff,
            "is_active": admin_user.is_active,
            "date_joined": admin_user.date_joined,
        }
        for admin_user in User.objects.order_by("-date_joined")[:6]
    ]

    return Response(
        {
            "stats": {
                "products_count": Product.objects.count(),
                "users_count": User.objects.count(),
                "active_users_count": User.objects.filter(is_active=True).count(),
                "staff_count": User.objects.filter(is_staff=True).count(),
                "orders_count": Order.objects.count(),
                "paid_orders_count": Order.objects.filter(status=Order.STATUS_PAID).count(),
                "pending_orders_count": Order.objects.filter(status=Order.STATUS_PENDING).count(),
                "feedback_pending_count": Feedback.objects.filter(status=Feedback.STATUS_PENDING).count(),
                "total_revenue": int(Order.objects.aggregate(total=Sum("total_amount")).get("total") or 0),
            },
            "recent_orders": recent_orders,
            "recent_feedback": recent_feedback,
            "recent_products": recent_products,
            "recent_users": recent_users,
        }
    )


@api_view(["GET", "POST"])
@throttle_classes([AuthUserRateThrottle])
def admin_products(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    if request.method == "GET":
        products = Product.objects.order_by("-id")[:200]
        return Response({"results": [serialize_product(product) for product in products]})

    name = sanitize_string(request.data.get("name", ""), 100)
    description = sanitize_string(request.data.get("description", ""), 1000)
    category = sanitize_string(request.data.get("category", ""), 100)

    try:
        price = int(request.data.get("price", 0))
    except (TypeError, ValueError):
        return Response({"error": "Price must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)

    if len(name) < 2:
        return Response({"error": "Product name is too short"}, status=status.HTTP_400_BAD_REQUEST)
    if not description:
        return Response({"error": "Description is required"}, status=status.HTTP_400_BAD_REQUEST)
    if price < 0:
        return Response({"error": "Price cannot be negative"}, status=status.HTTP_400_BAD_REQUEST)

    product = Product.objects.create(
        name=name,
        price=price,
        description=description,
        category=category,
    )
    return Response({"message": "Product created", "product": serialize_product(product)}, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@throttle_classes([AuthUserRateThrottle])
def admin_product_detail(request, product_id):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    product = Product.objects.filter(pk=product_id).first()
    if product is None:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        product.delete()
        return Response({"message": "Product deleted"})

    if "name" in request.data:
        name = sanitize_string(request.data.get("name", ""), 100)
        if len(name) < 2:
            return Response({"error": "Product name is too short"}, status=status.HTTP_400_BAD_REQUEST)
        product.name = name
    if "description" in request.data:
        description = sanitize_string(request.data.get("description", ""), 1000)
        if not description:
            return Response({"error": "Description is required"}, status=status.HTTP_400_BAD_REQUEST)
        product.description = description
    if "category" in request.data:
        product.category = sanitize_string(request.data.get("category", ""), 100)
    if "price" in request.data:
        try:
            price = int(request.data.get("price", 0))
        except (TypeError, ValueError):
            return Response({"error": "Price must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)
        if price < 0:
            return Response({"error": "Price cannot be negative"}, status=status.HTTP_400_BAD_REQUEST)
        product.price = price

    product.save()
    return Response({"message": "Product updated", "product": serialize_product(product)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_orders(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    orders = Order.objects.select_related("user").order_by("-created_at")[:200]
    return Response({"results": [serialize_order(order) for order in orders]})


@api_view(["PATCH"])
@throttle_classes([AuthUserRateThrottle])
def admin_order_detail(request, order_id):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    order = Order.objects.select_related("user").filter(pk=order_id).first()
    if order is None:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    next_status = str(request.data.get("status", "")).strip()
    valid_statuses = {choice[0] for choice in Order.STATUS_CHOICES}
    if next_status and next_status not in valid_statuses:
        return Response({"error": "Invalid order status"}, status=status.HTTP_400_BAD_REQUEST)

    if next_status:
        order.status = next_status
        order.save(update_fields=["status"])

    return Response({"message": "Order updated", "order": serialize_order(order)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_order_history(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    history_entries = OrderHistory.objects.select_related("user", "source_order").order_by("-ordered_at", "-id")[:200]
    return Response({"results": [serialize_order_history(entry) for entry in history_entries]})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_feedback(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    feedback_entries = Feedback.objects.select_related("user", "product").order_by("-created_at")[:200]
    return Response({"results": [serialize_feedback_admin(feedback) for feedback in feedback_entries]})


@api_view(["PATCH"])
@throttle_classes([AuthUserRateThrottle])
def admin_feedback_detail(request, feedback_id):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    feedback = Feedback.objects.select_related("user", "product").filter(pk=feedback_id).first()
    if feedback is None:
        return Response({"error": "Feedback not found"}, status=status.HTTP_404_NOT_FOUND)

    next_status = str(request.data.get("status", "")).strip().lower()
    valid_statuses = {choice[0] for choice in Feedback.STATUS_CHOICES}
    if next_status not in valid_statuses:
        return Response({"error": "Invalid feedback status"}, status=status.HTTP_400_BAD_REQUEST)

    feedback.status = next_status
    feedback.save(update_fields=["status", "updated_at"])
    return Response({"message": "Feedback updated", "feedback": serialize_feedback_admin(feedback)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_users(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    users = User.objects.prefetch_related("groups").order_by("-date_joined")[:200]
    return Response({"results": [serialize_user_admin(user) for user in users]})


@api_view(["PATCH"])
@throttle_classes([AuthUserRateThrottle])
def admin_user_detail(request, user_id):
    acting_user, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    user = User.objects.prefetch_related("groups").filter(pk=user_id).first()
    if user is None:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if "first_name" in request.data:
        user.first_name = sanitize_string(request.data.get("first_name", ""), 150)
    if "last_name" in request.data:
        user.last_name = sanitize_string(request.data.get("last_name", ""), 150)
    if "email" in request.data:
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.exclude(pk=user.id).filter(email__iexact=email).exists():
            return Response({"error": "Email is already used by another user"}, status=status.HTTP_400_BAD_REQUEST)
        user.email = email
    if "is_active" in request.data:
        user.is_active = bool(request.data.get("is_active"))
    if "is_staff" in request.data:
        if not acting_user.is_superuser and user.is_superuser:
            return Response({"error": "Only a superuser can change another superuser"}, status=status.HTTP_403_FORBIDDEN)
        user.is_staff = bool(request.data.get("is_staff"))
    if "group_ids" in request.data:
        group_ids = request.data.get("group_ids") or []
        if not isinstance(group_ids, list):
            return Response({"error": "group_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        groups = list(Group.objects.filter(id__in=group_ids))
        if len(groups) != len(set(int(group_id) for group_id in group_ids if str(group_id).isdigit())):
            return Response({"error": "One or more selected groups were not found"}, status=status.HTTP_400_BAD_REQUEST)
        user.groups.set(groups)

    user.save()
    return Response({"message": "User updated", "user": serialize_user_admin(user)})


@api_view(["POST"])
@throttle_classes([AuthUserRateThrottle])
def admin_create_staff_user(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    email = str(request.data.get("email", "")).strip().lower()
    first_name = sanitize_string(request.data.get("first_name", ""), 150)
    last_name = sanitize_string(request.data.get("last_name", ""), 150)
    password = str(request.data.get("password", "")).strip()
    username = re.sub(r"[^a-zA-Z0-9_.-]", "", str(request.data.get("username", "")).strip())[:30]

    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 6:
        return Response({"error": "Password must be at least 6 characters"}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email__iexact=email).exists():
        return Response({"error": "An account with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    if not username:
        username = re.sub(r"[^a-zA-Z0-9_.-]", "", email.split("@", 1)[0])[:30] or "staff_user"
    base_username = username
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username[:24]}{suffix}"
        suffix += 1

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
        is_staff=True,
    )
    return Response({"message": "Staff account created", "user": serialize_user_admin(user)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_groups(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    groups = Group.objects.prefetch_related("permissions__content_type").order_by("name")
    return Response({"results": [serialize_group(group) for group in groups]})


@api_view(["GET"])
@throttle_classes([FeedbackRateThrottle])
def get_feedback(request):
    feedback_entries = Feedback.objects.select_related("user", "product").exclude(
        status=Feedback.STATUS_HIDDEN
    ).order_by("-created_at")[:100]
    serializer = FeedbackSerializer(feedback_entries, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@throttle_classes([FeedbackRateThrottle])
def create_feedback(request):
    user = get_effective_user(request)
    if user is None:
        return Response(
            {"error": "Login required to submit feedback"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = FeedbackCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = serializer.validated_data
    feedback = Feedback.objects.create(
        user=user,
        product=payload.get("product"),
        target_type=payload["target_type"],
        rating=payload["rating"],
        title=sanitize_string(payload["title"], 120),
        message=sanitize_string(payload["message"], 1000),
        status=Feedback.STATUS_PENDING,
    )

    return Response(
        {
            "message": "Feedback submitted successfully",
            "feedback": FeedbackSerializer(feedback).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@throttle_classes([AuthRegisterRateThrottle])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = serializer.validated_data
    user = None
    email = payload["email"]
    base_username = email.split("@", 1)[0]
    username = re.sub(r"[^a-zA-Z0-9_.-]", "", base_username)[:30] or "petals_user"
    suffix = 1

    while User.objects.filter(username=username).exists():
        candidate = f"{base_username[:24]}{suffix}"
        username = re.sub(r"[^a-zA-Z0-9_.-]", "", candidate)[:30] or f"petals_user{suffix}"
        suffix += 1

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=payload["password"],
                first_name=payload["name"].strip(),
                is_active=False,
            )
    except Exception:
        if user and user.pk:
            user.delete()
        return Response(
            {"error": "We could not create your account right now. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        send_verification_email(request, user)
    except Exception:
        if user and user.pk and settings.DEBUG:
            user.is_active = True
            user.save(update_fields=["is_active"])
            return Response(
                {
                    "message": (
                        "Account created. Email delivery is unavailable in local development, "
                        "so the account was activated automatically."
                    ),
                    "user": serialize_auth_user(user),
                },
                status=status.HTTP_201_CREATED,
            )

        if user and user.pk:
            user.delete()
        return Response(
            {"error": "We could not send the verification email right now. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    debug_hint = ""
    if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
        debug_hint = " Email sending is currently using the console backend, so configure SMTP in backend/.env for real delivery."

    return Response(
        {
            "message": f"Account created. Check your email to verify your address before logging in.{debug_hint}",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def verify_email(request, uidb64, token):
    redirect_query = "verified=error"

    try:
        user_id = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.filter(pk=user_id).first()
    except (TypeError, ValueError, OverflowError):
        user = None

    if user and default_token_generator.check_token(user, token):
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])
        redirect_query = f"verified=success&email={user.email}"

    return redirect(build_frontend_login_url(redirect_query))


@api_view(["POST"])
@throttle_classes([AuthLoginRateThrottle])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"].strip().lower()
    password = serializer.validated_data["password"]

    matched_user = User.objects.filter(email__iexact=email).first()
    if matched_user and not matched_user.is_active:
        return Response(
            {"error": "Please verify your email address before logging in."},
            status=status.HTTP_403_FORBIDDEN,
        )

    username = matched_user.username if matched_user else email
    user = authenticate(request, username=username, password=password)

    if user is None:
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)
    return Response(
        {
            "message": "Logged in successfully",
            "user": serialize_auth_user(user),
        }
    )


@api_view(["POST"])
@throttle_classes([AuthUserRateThrottle])
def logout_user(request):
    logout(request)
    return Response({"message": "Logged out successfully"})


@api_view(["POST"])
@throttle_classes([OrderRateThrottle])
def create_order(request):
    user = get_effective_user(request)
    if user is None:
        return Response(
            {"error": "Login required to place an order"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

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
            user=user,
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
        order_obj.mongo_order_id = mongo_order_id
        order_obj.save(update_fields=["mongo_order_id"])
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
    user = get_effective_user(request)
    if user is None:
        return Response(
            {"error": "Login required to start payment"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

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
