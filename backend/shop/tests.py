import hashlib
import hmac
import razorpay
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Order, Product


@override_settings(DEBUG=True)
class DeliveryManagementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="maya",
            email="maya@example.com",
            password="secret123",
            first_name="Maya",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_delivery_options_exposes_same_day_availability(self):
        response = self.client.get("/api/delivery/options/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("slots", response.data)
        self.assertIn("same_day_available", response.data)
        self.assertEqual(len(response.data["slots"]), 3)

    def test_create_order_persists_delivery_details_and_tracking(self):
        delivery_date = timezone.now().date() + timedelta(days=1)
        payload = {
            "name": "Maya Patel",
            "phone": "9876543210",
            "address": "42 Blossom Street",
            "city": "Bengaluru",
            "pincode": "560001",
            "items": [{"id": "1", "name": "Rose Bouquet", "price": 1499, "qty": 1}],
            "delivery_date": delivery_date.isoformat(),
            "delivery_slot": "morning",
            "gift_message": "Happy birthday, keep blooming!",
            "occasion": "birthday",
        }

        response = self.client.post("/api/order/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["admin_order_id"])
        self.assertEqual(str(order.delivery_date), delivery_date.isoformat())
        self.assertEqual(order.delivery_slot, "morning")
        self.assertEqual(order.gift_message, "Happy birthday, keep blooming!")
        self.assertEqual(order.delivery_status, Order.DELIVERY_STATUS_ORDER_PLACED)
        self.assertEqual(order.tracking_events.count(), 1)

    def test_admin_can_update_delivery_status_and_create_tracking_event(self):
        staff_user = User.objects.create_user(
            username="florist_admin",
            email="admin@example.com",
            password="secret123",
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        order = Order.objects.create(
            user=self.user,
            name="Maya Patel",
            phone="9876543210",
            address="42 Blossom Street",
            city="Bengaluru",
            pincode="560001",
            items=[{"id": "1", "name": "Rose Bouquet", "price": 1499, "qty": 1}],
            total_amount=1499,
            delivery_date=timezone.now().date() + timedelta(days=1),
            delivery_slot="evening",
        )
        self.client.force_authenticate(user=staff_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/",
            {"delivery_status": "out_for_delivery"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, "out_for_delivery")
        self.assertGreaterEqual(order.tracking_events.count(), 1)
        self.assertEqual(order.tracking_events.order_by("-created_at").first().status, "out_for_delivery")

    def test_staff_without_superuser_cannot_update_admin_data(self):
        staff_user = User.objects.create_user(
            username="limited_staff",
            email="limited@example.com",
            password="secret123",
            is_staff=True,
            is_superuser=False,
            is_active=True,
        )
        order = Order.objects.create(
            user=self.user,
            name="Maya Patel",
            phone="9876543210",
            address="42 Blossom Street",
            city="Bengaluru",
            pincode="560001",
            items=[{"id": "1", "name": "Rose Bouquet", "price": 1499, "qty": 1}],
            total_amount=1499,
            delivery_date=timezone.now().date() + timedelta(days=1),
            delivery_slot="evening",
        )
        self.client.force_authenticate(user=staff_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/",
            {"delivery_status": "out_for_delivery"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "Active staff superuser access required")

    def test_admin_updates_flower_and_bouquet_prices(self):
        admin_user = User.objects.create_user(
            username="price_admin",
            email="price-admin@example.com",
            password="secret123",
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        product = Product.objects.create(
            name="Rose Bouquet",
            price=100,
            flower_price=100,
            bouquet_price=500,
            description="Fresh roses",
            category="Roses",
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.patch(
            f"/api/admin/products/{product.id}/",
            {"flower_price": 125, "bouquet_price": 799},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.price, 125)
        self.assertEqual(product.flower_price, 125)
        self.assertEqual(product.bouquet_price, 799)
        self.assertEqual(response.data["product"]["price"], 125)
        self.assertEqual(response.data["product"]["flower_price"], 125)
        self.assertEqual(response.data["product"]["bouquet_price"], 799)

    def test_create_order_rejects_unverified_online_payment_payload(self):
        delivery_date = timezone.now().date() + timedelta(days=1)
        payload = {
            "name": "Maya Patel",
            "phone": "9876543210",
            "address": "42 Blossom Street",
            "city": "Bengaluru",
            "pincode": "560001",
            "items": [{"id": "1", "name": "Rose Bouquet", "price": 1499, "qty": 1}],
            "delivery_date": delivery_date.isoformat(),
            "delivery_slot": "morning",
            "payment_method": "ONLINE",
            "payment_status": "PAID",
            "payment_order_id": "order_test_123",
            "payment_id": "pay_test_123",
        }

        response = self.client.post("/api/order/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID="rzp_test_key", RAZORPAY_KEY_SECRET="rzp_test_secret")
    def test_verify_payment_creates_paid_online_order(self):
        delivery_date = timezone.now().date() + timedelta(days=1)
        payment_order_id = "order_test_123"
        payment_id = "pay_test_123"
        signature = hmac.new(
            b"rzp_test_secret",
            f"{payment_order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        payload = {
            "name": "Maya Patel",
            "phone": "9876543210",
            "address": "42 Blossom Street",
            "city": "Bengaluru",
            "pincode": "560001",
            "items": [{"id": "1", "name": "Rose Bouquet", "price": 1499, "qty": 1}],
            "delivery_date": delivery_date.isoformat(),
            "delivery_slot": "morning",
            "payment_method": "ONLINE",
            "payment_status": "PAID",
            "payment_order_id": payment_order_id,
            "payment_id": payment_id,
            "payment_signature": signature,
        }

        response = self.client.post("/api/payment/verify/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["admin_order_id"])
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.payment_order_id, payment_order_id)
        self.assertEqual(order.payment_id, payment_id)


@override_settings(DEBUG=True)
class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="nareanbharath25",
            email="nareanbharath25@gmail.com",
            password="secret123",
            first_name="nn",
            is_active=True,
        )

    def test_login_accepts_username_identifier(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.user.username, "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], self.user.username)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_register_sends_verification_email_and_keeps_user_inactive(self):
        response = self.client.post(
            "/api/auth/register/",
            {"name": "New Customer", "email": "new.customer@gmail.com", "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("user", response.data)
        self.assertFalse(User.objects.get(email="new.customer@gmail.com").is_active)
        self.assertNotIn("pf_access_token", response.cookies)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("new.customer@gmail.com", mail.outbox[0].to)
        self.assertIn("/api/auth/verify-email/", mail.outbox[0].body)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_unverified_user_cannot_login_until_email_verified(self):
        self.client.post(
            "/api/auth/register/",
            {"name": "New Customer", "email": "new.customer@gmail.com", "password": "secret123"},
            format="json",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": "new.customer@gmail.com", "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "Please verify your email address before logging in.")

    def test_existing_unverified_user_cannot_login(self):
        inactive_user = User.objects.create_user(
            username="old_customer",
            email="old.customer@gmail.com",
            password="secret123",
            is_active=False,
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": inactive_user.email, "password": "secret123"},
            format="json",
        )

        inactive_user.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertFalse(inactive_user.is_active)
        self.assertEqual(response.data["error"], "Please verify your email address before logging in.")

    def test_login_reports_missing_account(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "missing@example.com", "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "No account found with this email or username.")

    def test_login_reports_wrong_password_for_existing_account(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "wrongpass"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Password is incorrect for this account.")


@override_settings(DEBUG=True, RAZORPAY_KEY_ID="rzp_test_key", RAZORPAY_KEY_SECRET="rzp_test_secret")
class PaymentApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="checkout_user",
            email="checkout@example.com",
            password="secret123",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    @patch("shop.views.razorpay.Client")
    def test_create_payment_returns_backend_key_id_and_order_id(self, client_cls):
        client_instance = MagicMock()
        client_instance.order.create.return_value = {"id": "order_live_123"}
        client_cls.return_value = client_instance

        response = self.client.post("/api/payment/create/", {"amount": 149900}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["order_id"], "order_live_123")
        self.assertEqual(response.data["key_id"], "rzp_test_key")

    @patch("shop.views.razorpay.Client")
    def test_create_payment_reports_razorpay_auth_failure_in_debug(self, client_cls):
        client_instance = MagicMock()
        client_instance.order.create.side_effect = razorpay.errors.BadRequestError("Authentication failed")
        client_cls.return_value = client_instance

        response = self.client.post("/api/payment/create/", {"amount": 149900}, format="json")

        self.assertEqual(response.status_code, 503)
        self.assertIn("Razorpay authentication failed", response.data["error"])
