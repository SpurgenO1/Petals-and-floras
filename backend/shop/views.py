import hashlib
import hmac
import json
import logging
import razorpay
from collections import Counter
from datetime import timedelta
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import Group, User
from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse, HttpResponseForbidden
from django.db import transaction
from django.db.models import Sum
from django.middleware.csrf import get_token
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import csrf_exempt
from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
import re

from .catalog import CATALOG_PRODUCTS
from .delivery import (
    MAX_DELIVERY_DAYS_AHEAD,
    SAME_DAY_CUTOFF_HOUR,
    build_slot_availability,
    get_business_now,
    get_business_today,
    get_delivery_status_label,
    get_slot_label,
    parse_delivery_date,
)
from .models import Feedback, Order, OrderHistory, OrderTrackingEvent, Product
from .serializers import (
    AuthUserSerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
    LoginSerializer,
    OrderHistorySerializer,
    OrderSerializer,
    PaymentOrderCreateSerializer,
    PaymentVerificationSerializer,
    ProductSerializer,
    RegisterSerializer,
)
from .throttles import OrderRateThrottle, PaymentRateThrottle, ProductRateThrottle
from .throttles import AuthLoginRateThrottle, AuthRegisterRateThrottle, AuthUserRateThrottle, FeedbackRateThrottle


payment_logger = logging.getLogger("payments")
security_logger = logging.getLogger("security")
ACCESS_COOKIE_NAME = "pf_access_token"
REFRESH_COOKIE_NAME = "pf_refresh_token"


def validate_order(data):
    required_fields = ["name", "phone", "address", "delivery_date", "delivery_slot"]
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


def get_delivery_slot_counts(delivery_date):
    rows = (
        Order.objects.filter(delivery_date=delivery_date)
        .exclude(status=Order.STATUS_CANCELLED)
        .values_list("delivery_slot", flat=True)
    )
    return Counter(slot for slot in rows if slot)


def validate_delivery_request(delivery_date, delivery_slot, request_same_day=False, now=None):
    current_time = now or get_business_now()
    if delivery_date is None:
        return "Select a valid delivery date."

    today = current_time.date()
    if delivery_date < today:
        return "Past delivery dates are unavailable."

    if delivery_date > today + timedelta(days=MAX_DELIVERY_DAYS_AHEAD):
        return "Choose a delivery date within the next 21 days."

    available_slots = build_slot_availability(
        delivery_date,
        slot_counts=get_delivery_slot_counts(delivery_date),
        now=current_time,
    )
    slot_map = {slot["code"]: slot for slot in available_slots}
    selected_slot = slot_map.get(delivery_slot)
    if not selected_slot:
        return "Select an available delivery time slot."

    if not selected_slot["available"]:
        return selected_slot["reason"] or "This delivery slot is unavailable."

    if request_same_day and delivery_date != today:
        return "Same-day delivery can only be selected for today's date."

    return None


def build_tracking_description(status_code, order):
    slot_label = get_slot_label(order.delivery_slot) or "your selected window"
    occasion_label = dict(Order.OCCASION_CHOICES).get(order.occasion, "")

    descriptions = {
        Order.DELIVERY_STATUS_ORDER_PLACED: (
            f"We've reserved {slot_label} on {order.delivery_date} for your flowers."
        ),
        "preparing_bouquet": (
            f"Our florists are hand-tying your arrangement{f' for the {occasion_label.lower()}' if occasion_label else ''}."
        ),
        "out_for_delivery": "Your bouquet is on the road and getting its final careful handling.",
        "delivered": "Delivered with care. We hope the moment feels every bit as special as the flowers.",
    }
    return descriptions.get(status_code, "")


def append_tracking_event(order, status_code, description=""):
    latest_event = order.tracking_events.order_by("-created_at", "-id").first()
    if latest_event and latest_event.status == status_code:
        if description and latest_event.description != description:
            latest_event.description = description
            latest_event.title = get_delivery_status_label(status_code) or latest_event.title
            latest_event.save(update_fields=["title", "description"])
        return latest_event

    return OrderTrackingEvent.objects.create(
        order=order,
        status=status_code,
        title=get_delivery_status_label(status_code) or "Order update",
        description=description,
    )


def serialize_auth_user(user):
    serializer = AuthUserSerializer(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.get_full_name() or user.username,
            "is_active": user.is_active,
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
    if not (user.is_active and user.is_staff and user.is_superuser):
        return None, Response(
            {"error": "Active staff superuser access required"},
            status=status.HTTP_403_FORBIDDEN,
        )
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


ALLOWED_PRODUCT_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_PRODUCT_PHOTO_SIZE = 5 * 1024 * 1024


def get_product_photo_url(product, request=None):
    if not getattr(product, "photo", ""):
        return ""
    try:
        url = product.photo.url
    except ValueError:
        return ""
    return request.build_absolute_uri(url) if request is not None else url


def validate_product_photo(uploaded_file):
    if uploaded_file is None:
        return ""
    if getattr(uploaded_file, "size", 0) > MAX_PRODUCT_PHOTO_SIZE:
        return "Product photo must be 5MB or smaller"
    content_type = str(getattr(uploaded_file, "content_type", "")).lower()
    if content_type not in ALLOWED_PRODUCT_PHOTO_TYPES:
        return "Product photo must be a JPG, PNG, WebP, or GIF image"
    return ""


def serialize_product(product, request=None):
    flower_price = int(product.flower_price or product.price or 0)
    bouquet_price = int(product.bouquet_price or flower_price)
    photo_url = get_product_photo_url(product, request)
    return {
        "id": product.id,
        "name": product.name,
        "price": flower_price,
        "flower_price": flower_price,
        "bouquet_price": bouquet_price,
        "description": product.description,
        "category": product.category or "",
        "image": photo_url,
        "photo_url": photo_url,
    }


def parse_product_price(value, label):
    try:
        price = int(value)
    except (TypeError, ValueError):
        return None, f"{label} must be a valid number"

    if price < 0:
        return None, f"{label} cannot be negative"

    return price, ""


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
        "legacy_order_id": order.legacy_order_id,
        "delivery_date": order.delivery_date,
        "delivery_slot": order.delivery_slot,
        "delivery_slot_label": get_slot_label(order.delivery_slot),
        "same_day_delivery": order.same_day_delivery,
        "gift_message": order.gift_message,
        "occasion": order.occasion,
        "delivery_status": order.delivery_status,
        "delivery_status_label": get_delivery_status_label(order.delivery_status),
        "delivery_status_updated_at": order.delivery_status_updated_at,
        "tracking_events": [
            {
                "status": event.status,
                "label": get_delivery_status_label(event.status),
                "title": event.title,
                "description": event.description,
                "created_at": event.created_at,
            }
            for event in order.tracking_events.all()
        ],
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
        "legacy_order_id": entry.legacy_order_id,
        "delivery_date": entry.delivery_date,
        "delivery_slot": entry.delivery_slot,
        "delivery_slot_label": get_slot_label(entry.delivery_slot),
        "same_day_delivery": entry.same_day_delivery,
        "gift_message": entry.gift_message,
        "occasion": entry.occasion,
        "delivery_status": entry.delivery_status,
        "delivery_status_label": get_delivery_status_label(entry.delivery_status),
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


def build_order_payment_summary(payload):
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
        "method": payment_method,
        "status": payment_status,
    }


def prepare_order_payload(validated_data):
    payload = dict(validated_data)
    delivery_date = payload.get("delivery_date")
    same_day_delivery = bool(payload.get("same_day_delivery"))

    payload["status"] = payload.get("status", Order.STATUS_PENDING)
    payload["total_amount"] = calculate_total(payload.get("items", []))
    payload["payment_method"] = payload.get("payment_method", "COD").upper()
    payload["payment_status"] = payload.get("payment_status", "UNPAID").upper()
    payload["delivery_status"] = Order.DELIVERY_STATUS_ORDER_PLACED
    payload["gift_message"] = payload.get("gift_message", "").strip()
    payload["occasion"] = payload.get("occasion", "").strip()
    payload["same_day_delivery"] = same_day_delivery or delivery_date == get_business_today()

    if payload.get("payment_id"):
        payload["status"] = Order.STATUS_PAID
        payload["payment_method"] = "ONLINE"
        payload["payment_status"] = "PAID"

    return payload


def persist_order(user, payload):
    payment_id = sanitize_string(payload.get("payment_id", ""), 100)
    if payment_id and Order.objects.filter(payment_id=payment_id).exists():
        return None, Response(
            {"error": "This payment has already been used for an order."},
            status=status.HTTP_409_CONFLICT,
        )

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
            payment_id=payment_id,
            delivery_date=payload["delivery_date"],
            delivery_slot=payload["delivery_slot"],
            same_day_delivery=payload["same_day_delivery"],
            gift_message=sanitize_string(payload.get("gift_message", ""), 300),
            occasion=sanitize_string(payload.get("occasion", ""), 30),
            delivery_status=payload["delivery_status"],
        )
    except Exception:
        return None, Response({"error": "Order creation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    append_tracking_event(
        order_obj,
        order_obj.delivery_status,
        description=build_tracking_description(order_obj.delivery_status, order_obj),
    )

    payment_summary = build_order_payment_summary(payload)

    return (
        {
            "message": "Order placed successfully",
            "order_id": order_obj.id,
            "admin_order_id": order_obj.id,
            "status": order_obj.status,
            "delivery_status": order_obj.delivery_status,
            "delivery_status_label": get_delivery_status_label(order_obj.delivery_status),
            "delivery_date": order_obj.delivery_date,
            "delivery_slot": order_obj.delivery_slot,
            "delivery_slot_label": get_slot_label(order_obj.delivery_slot),
            "payment_method": payment_summary["method"],
            "payment_status": payment_summary["status"],
            "warning": "",
        },
        None,
    )


def set_auth_cookies(response, user):
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    secure_cookie = not settings.DEBUG
    samesite_value = "None" if secure_cookie else "Lax"

    response.set_cookie(
        ACCESS_COOKIE_NAME,
        str(access),
        httponly=True,
        secure=secure_cookie,
        samesite=samesite_value,
        max_age=15 * 60,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        str(refresh),
        httponly=True,
        secure=secure_cookie,
        samesite=samesite_value,
        max_age=7 * 24 * 60 * 60,
        path="/api/auth/",
    )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth/")


def get_refresh_cookie(request):
    return request.COOKIES.get(REFRESH_COOKIE_NAME, "")


def verify_razorpay_payment_signature(payment_order_id, payment_id, payment_signature):
    if not payment_order_id or not payment_id or not payment_signature:
        return False
    if not settings.RAZORPAY_KEY_SECRET:
        return False

    message = f"{payment_order_id}|{payment_id}".encode("utf-8")
    secret = settings.RAZORPAY_KEY_SECRET.encode("utf-8")
    expected_signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_signature, payment_signature)


def verify_razorpay_webhook_signature(body, signature):
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False

    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)


@api_view(["GET"])
@throttle_classes([ProductRateThrottle])
def get_products(request):
    django_products = list(Product.objects.all().order_by("id")[:200])
    product_map = {}

    for item in django_products:
        name = sanitize_string(item.name, 100)
        category = sanitize_string(item.category or "Floral", 50)
        dedupe_key = f"django::{item.id}"
        product_map[dedupe_key] = {
            "id": str(item.id),
            "name": name,
            "price": int(item.flower_price or item.price or 0),
            "flower_price": int(item.flower_price or item.price or 0),
            "bouquet_price": int(item.bouquet_price or item.flower_price or item.price or 0),
            "old_price": None,
            "description": sanitize_string(item.description, 500),
            "category": category,
            "image": get_product_photo_url(item, request),
            "photo_url": get_product_photo_url(item, request),
        }

    products = list(product_map.values())

    if not products:
        products = [
            {
                "id": item["id"],
                "name": sanitize_string(item["name"], 100),
                "price": int(item["price"]),
                "flower_price": int(item.get("flower_price", item["price"])),
                "bouquet_price": int(item.get("bouquet_price", item.get("flower_price", item["price"]))),
                "old_price": item["old_price"],
                "description": sanitize_string(item["description"], 500),
                "category": sanitize_string(item["category"], 50),
                "image": "",
                "photo_url": "",
            }
            for item in CATALOG_PRODUCTS
        ]

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def system_status(request):
    return Response(
        {
            "backend": {
                "ok": True,
                "service": "django",
            },
            "database": {
                "ok": True,
                "engine": settings.DATABASES["default"]["ENGINE"],
                "name": str(settings.DATABASES["default"].get("NAME", "")),
            },
            "django_admin": {
                "ok": True,
                "url": "/admin/",
            },
        }
    )


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    return Response(serialize_auth_user(request.user))


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
@permission_classes([AllowAny])
def get_csrf_token(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
@permission_classes([IsAuthenticated])
def get_order_history(request):
    # Safe ORM usage: filter values through parameterized queries generated by Django.
    # Avoid building raw SQL like:
    # Order.objects.raw(f"SELECT * FROM shop_order WHERE user_id = {request.GET['user_id']}")
    orders = Order.objects.filter(user=request.user).prefetch_related("tracking_events").order_by("-created_at")
    serializer = OrderHistorySerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@throttle_classes([OrderRateThrottle])
def get_delivery_options(request):
    requested_date = parse_delivery_date(request.query_params.get("date"))
    current_time = get_business_now()
    delivery_date = requested_date or current_time.date()
    slots = build_slot_availability(
        delivery_date,
        slot_counts=get_delivery_slot_counts(delivery_date),
        now=current_time,
    )
    return Response(
        {
            "today": get_business_today(),
            "selected_date": delivery_date,
            "same_day_available": delivery_date == current_time.date() and current_time.hour < SAME_DAY_CUTOFF_HOUR,
            "same_day_cutoff_hour": SAME_DAY_CUTOFF_HOUR,
            "slots": slots,
            "max_delivery_days_ahead": MAX_DELIVERY_DAYS_AHEAD,
            "timezone": "Asia/Kolkata",
        }
    )


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
        django_products = list(Product.objects.order_by("-id")[:200])
        results = []

        for product in django_products:
            serialized = serialize_product(product, request)
            serialized["source"] = "django"
            results.append(serialized)

        return Response({"results": results})

    name = sanitize_string(request.data.get("name", ""), 100)
    description = sanitize_string(request.data.get("description", ""), 1000)
    category = sanitize_string(request.data.get("category", ""), 100)

    flower_price, error = parse_product_price(
        request.data.get("flower_price", request.data.get("price", 0)),
        "Flower price",
    )
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    bouquet_price, error = parse_product_price(
        request.data.get("bouquet_price", flower_price),
        "Bouquet price",
    )
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    if len(name) < 2:
        return Response({"error": "Product name is too short"}, status=status.HTTP_400_BAD_REQUEST)
    if not description:
        return Response({"error": "Description is required"}, status=status.HTTP_400_BAD_REQUEST)
    photo = request.FILES.get("photo")
    photo_error = validate_product_photo(photo)
    if photo_error:
        return Response({"error": photo_error}, status=status.HTTP_400_BAD_REQUEST)

    product = Product.objects.create(
        name=name,
        price=flower_price,
        flower_price=flower_price,
        bouquet_price=bouquet_price,
        description=description,
        category=category,
        photo=photo or "",
    )
    return Response({"message": "Product created", "product": serialize_product(product, request)}, status=status.HTTP_201_CREATED)


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
    if "price" in request.data or "flower_price" in request.data:
        flower_price, error = parse_product_price(
            request.data.get("flower_price", request.data.get("price", product.flower_price or product.price or 0)),
            "Flower price",
        )
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
        product.flower_price = flower_price
        product.price = flower_price
    if "bouquet_price" in request.data:
        bouquet_price, error = parse_product_price(
            request.data.get("bouquet_price", product.bouquet_price or product.flower_price or product.price or 0),
            "Bouquet price",
        )
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
        product.bouquet_price = bouquet_price
    if "photo" in request.FILES:
        photo = request.FILES.get("photo")
        photo_error = validate_product_photo(photo)
        if photo_error:
            return Response({"error": photo_error}, status=status.HTTP_400_BAD_REQUEST)
        product.photo = photo
    if str(request.data.get("remove_photo", "")).lower() in {"1", "true", "yes"}:
        if product.photo:
            product.photo.delete(save=False)
        product.photo = ""

    product.save()
    return Response({"message": "Product updated", "product": serialize_product(product, request)})


@api_view(["GET"])
@throttle_classes([AuthUserRateThrottle])
def admin_orders(request):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    orders = Order.objects.select_related("user").prefetch_related("tracking_events").order_by("-created_at")[:200]
    return Response({"results": [serialize_order(order) for order in orders]})


@api_view(["PATCH"])
@throttle_classes([AuthUserRateThrottle])
def admin_order_detail(request, order_id):
    _, denied_response = get_staff_user(request)
    if denied_response is not None:
        return denied_response

    order = Order.objects.select_related("user").prefetch_related("tracking_events").filter(pk=order_id).first()
    if order is None:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    next_status = str(request.data.get("status", "")).strip()
    valid_statuses = {choice[0] for choice in Order.STATUS_CHOICES}
    if next_status and next_status not in valid_statuses:
        return Response({"error": "Invalid order status"}, status=status.HTTP_400_BAD_REQUEST)

    next_delivery_status = str(request.data.get("delivery_status", "")).strip()
    valid_delivery_statuses = {choice[0] for choice in Order.DELIVERY_STATUS_CHOICES}
    if next_delivery_status and next_delivery_status not in valid_delivery_statuses:
        return Response({"error": "Invalid delivery status"}, status=status.HTTP_400_BAD_REQUEST)

    if next_status:
        order.status = next_status
    if next_delivery_status:
        order.delivery_status = next_delivery_status
        order.delivery_status_updated_at = timezone.now()
    if next_status or next_delivery_status:
        update_fields = ["status"] if next_status else []
        if next_delivery_status:
            update_fields.extend(["delivery_status", "delivery_status_updated_at"])
        order.save(update_fields=update_fields)
        if next_delivery_status:
            append_tracking_event(
                order,
                next_delivery_status,
                description=build_tracking_description(next_delivery_status, order),
            )
            if hasattr(order, "_prefetched_objects_cache"):
                order._prefetched_objects_cache.pop("tracking_events", None)

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
        is_superuser=True,
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
            user = User.objects.create(
                username=username,
                email=email,
                password=make_password(payload["password"]),
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
@ratelimit(key="ip", rate=settings.AUTH_LOGIN_RATELIMIT, method="POST", block=True)
def login_user(request):
    django_request = getattr(request, "_request", request)
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    raw_identifier = serializer.validated_data["identifier"].strip()
    password = serializer.validated_data["password"]
    normalized_identifier = raw_identifier.lower()

    if "@" in raw_identifier:
        matched_user = User.objects.filter(email__iexact=normalized_identifier).first()
    else:
        matched_user = User.objects.filter(username__iexact=raw_identifier).first()

    if matched_user and not matched_user.is_active:
        return Response(
            {"error": "Please verify your email address before logging in."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if matched_user and settings.DEBUG and not matched_user.has_usable_password():
        return Response(
            {"error": "This account does not have a password login enabled."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if matched_user is None:
        return Response(
            {"error": "No account found with this email or username."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not matched_user.check_password(password):
        return Response(
            {"error": "Password is incorrect for this account."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(django_request, matched_user, backend="django.contrib.auth.backends.ModelBackend")
    response = Response(
        {
            "message": "Logged in successfully",
            "user": serialize_auth_user(matched_user),
        }
    )
    set_auth_cookies(response, matched_user)
    return response


@api_view(["POST"])
@throttle_classes([AuthUserRateThrottle])
@permission_classes([AllowAny])
def logout_user(request):
    django_request = getattr(request, "_request", request)
    refresh_token = get_refresh_cookie(request)
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass

    logout(django_request)
    response = Response({"message": "Logged out successfully"})
    clear_auth_cookies(response)
    return response


@api_view(["POST"])
@throttle_classes([AuthUserRateThrottle])
@permission_classes([AllowAny])
def refresh_token(request):
    raw_refresh_token = get_refresh_cookie(request)
    if not raw_refresh_token:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        refresh = RefreshToken(raw_refresh_token)
        user = User.objects.get(pk=refresh["user_id"])
        response = Response({"message": "Session refreshed", "user": serialize_auth_user(user)})
        set_auth_cookies(response, user)
        try:
            refresh.blacklist()
        except TokenError:
            pass
        return response
    except Exception:
        response = Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        clear_auth_cookies(response)
        return response


@api_view(["POST"])
@throttle_classes([OrderRateThrottle])
@permission_classes([IsAuthenticated])
def create_order(request):
    user = request.user

    error = validate_order(request.data)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    serializer = OrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = prepare_order_payload(serializer.validated_data)
    delivery_date = payload.get("delivery_date")
    delivery_slot = payload.get("delivery_slot", "")
    same_day_delivery = bool(payload.get("same_day_delivery"))
    delivery_error = validate_delivery_request(
        delivery_date,
        delivery_slot,
        request_same_day=same_day_delivery,
    )
    if delivery_error:
        return Response({"error": delivery_error}, status=status.HTTP_400_BAD_REQUEST)

    if str(payload.get("payment_method", "")).upper() == "ONLINE" or payload.get("payment_id"):
        return Response(
            {"error": "Online payments must be verified before creating the order."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_payload, error_response = persist_order(user, payload)
    if error_response is not None:
        return error_response

    return Response(response_payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@throttle_classes([PaymentRateThrottle])
@permission_classes([IsAuthenticated])
@ratelimit(key="user_or_ip", rate="10/m", method="POST", block=True)
def create_payment(request):
    serializer = PaymentOrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": "Invalid payment request"}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        payment_logger.warning("Razorpay not configured for create_order")
        return Response({"error": "Something went wrong"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        razorpay_order = client.order.create(
            {
                "amount": serializer.validated_data["amount"],
                "currency": "INR",
                "payment_capture": 1,
            }
        )
        payment_logger.info(
            "Created Razorpay order",
            extra={"order_id": razorpay_order.get("id"), "user_id": request.user.id},
        )
        return Response(
            {
                "order_id": razorpay_order.get("id"),
                "key_id": settings.RAZORPAY_KEY_ID,
            },
            status=status.HTTP_201_CREATED,
        )
    except razorpay.errors.BadRequestError as exc:
        payment_logger.exception("Razorpay create order failed")
        if settings.DEBUG and "Authentication failed" in str(exc):
            return Response(
                {"error": "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"error": "Something went wrong"}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception:
        payment_logger.exception("Razorpay create order failed")
        return Response({"error": "Something went wrong"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["POST"])
@throttle_classes([PaymentRateThrottle])
@permission_classes([IsAuthenticated])
@ratelimit(key="user_or_ip", rate="10/m", method="POST", block=True)
def verify_payment(request):
    serializer = PaymentVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": "Invalid payment payload"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = prepare_order_payload(serializer.validated_data)
        delivery_error = validate_delivery_request(
            payload.get("delivery_date"),
            payload.get("delivery_slot", ""),
            request_same_day=bool(payload.get("same_day_delivery")),
        )
        if delivery_error:
            return Response({"error": "Invalid payment payload"}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_razorpay_payment_signature(
            payload.get("payment_order_id", ""),
            payload.get("payment_id", ""),
            payload.get("payment_signature", ""),
        ):
            payment_logger.warning(
                "Rejected invalid Razorpay signature",
                extra={"user_id": request.user.id, "payment_order_id": payload.get("payment_order_id", "")},
            )
            return Response({"error": "Something went wrong"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if Order.objects.select_for_update().filter(payment_id=payload["payment_id"]).exists():
                payment_logger.warning(
                    "Duplicate payment verify blocked",
                    extra={"payment_id": payload["payment_id"], "user_id": request.user.id},
                )
                return Response({"error": "Payment already processed"}, status=status.HTTP_409_CONFLICT)

            if Order.objects.select_for_update().filter(payment_order_id=payload["payment_order_id"]).exists():
                payment_logger.warning(
                    "Duplicate Razorpay order verify blocked",
                    extra={"payment_order_id": payload["payment_order_id"], "user_id": request.user.id},
                )
                return Response({"error": "Payment already processed"}, status=status.HTTP_409_CONFLICT)

            response_payload, error_response = persist_order(request.user, payload)
            if error_response is not None:
                return Response({"error": "Something went wrong"}, status=error_response.status_code)

        payment_logger.info(
            "Payment verified and order persisted",
            extra={"payment_id": payload["payment_id"], "payment_order_id": payload["payment_order_id"]},
        )
        return Response(response_payload, status=status.HTTP_201_CREATED)
    except Exception:
        payment_logger.exception("Payment verification failed")
        return Response({"error": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    signature = request.headers.get("X-Razorpay-Signature", "")
    body = request.body or b""

    if not verify_razorpay_webhook_signature(body, signature):
        security_logger.warning("Rejected invalid Razorpay webhook signature")
        return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

    event_name = payload.get("event", "")
    payment_entity = (((payload.get("payload") or {}).get("payment") or {}).get("entity") or {})
    payment_id = str(payment_entity.get("id", "")).strip()
    payment_order_id = str(payment_entity.get("order_id", "")).strip()

    try:
        existing_order = Order.objects.filter(payment_id=payment_id).first() if payment_id else None
        if existing_order and existing_order.status == Order.STATUS_PAID:
            payment_logger.info("Webhook already processed", extra={"payment_id": payment_id, "event": event_name})
            return Response({"status": "ok"}, status=status.HTTP_200_OK)

        if existing_order and event_name in {"payment.captured", "order.paid"}:
            existing_order.status = Order.STATUS_PAID
            existing_order.payment_order_id = payment_order_id or existing_order.payment_order_id
            existing_order.save(update_fields=["status", "payment_order_id", "payment_id"])
            payment_logger.info("Webhook marked order as paid", extra={"payment_id": payment_id, "event": event_name})
            return Response({"status": "ok"}, status=status.HTTP_200_OK)

        payment_logger.info(
            "Webhook accepted without local state change",
            extra={"payment_id": payment_id, "payment_order_id": payment_order_id, "event": event_name},
        )
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
    except Exception:
        payment_logger.exception("Webhook processing failed")
        return Response({"error": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def csrf_failure(request, reason=""):
    """Return JSON for API requests and a normal Django response for admin/pages."""
    request_path = getattr(request, "path", "") or ""
    accepts_json = "application/json" in str(request.headers.get("Accept", "")).lower()

    if request_path.startswith("/api/") or accepts_json:
        return JsonResponse(
            {"error": "CSRF validation failed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    return HttpResponseForbidden("CSRF verification failed. Request aborted.")
