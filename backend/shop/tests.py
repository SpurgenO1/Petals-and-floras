from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Order


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
        self.client.credentials(HTTP_X_DEBUG_USER_EMAIL=self.user.email)

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
        self.client.credentials(HTTP_X_DEBUG_USER_EMAIL=staff_user.email)

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
    @patch("shop.views.razorpay.Client")
    def test_verify_payment_creates_paid_online_order(self, mock_razorpay_client):
        delivery_date = timezone.now().date() + timedelta(days=1)
        mock_client_instance = mock_razorpay_client.return_value
        mock_client_instance.utility.verify_payment_signature.return_value = None

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
            "payment_signature": "signature_test_123",
        }

        response = self.client.post("/api/payment/verify/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["admin_order_id"])
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.payment_order_id, "order_test_123")
        self.assertEqual(order.payment_id, "pay_test_123")
        mock_client_instance.utility.verify_payment_signature.assert_called_once()
