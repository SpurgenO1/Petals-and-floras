from django.db import models
from django.db.models import Q
from django.contrib.auth.models import User
from django.utils import timezone

from .delivery import (
    get_delivery_status_choices,
    get_slot_choices,
)


class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.IntegerField()
    flower_price = models.IntegerField(default=0)
    bouquet_price = models.IntegerField(default=0)
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True, default="")

    def save(self, *args, **kwargs):
        if not self.flower_price:
            self.flower_price = int(self.price or 0)
        if not self.price:
            self.price = int(self.flower_price or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_PAID = "Paid"
    STATUS_FAILED = "Failed"
    STATUS_CANCELLED = "Cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]
    OCCASION_BIRTHDAY = "birthday"
    OCCASION_ANNIVERSARY = "anniversary"
    OCCASION_THANK_YOU = "thank_you"
    OCCASION_JUST_BECAUSE = "just_because"
    OCCASION_CHOICES = [
        (OCCASION_BIRTHDAY, "Birthday"),
        (OCCASION_ANNIVERSARY, "Anniversary"),
        (OCCASION_THANK_YOU, "Thank You"),
        (OCCASION_JUST_BECAUSE, "Just Because"),
    ]
    DELIVERY_STATUS_ORDER_PLACED = "order_placed"
    DELIVERY_STATUS_CHOICES = get_delivery_status_choices()

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=50)
    pincode = models.CharField(max_length=10)
    items = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    total_amount = models.IntegerField(default=0)
    payment_order_id = models.CharField(max_length=100, blank=True, default="")
    payment_id = models.CharField(max_length=100, blank=True, default="")
    mongo_order_id = models.CharField(max_length=100, blank=True, default="")
    delivery_date = models.DateField(null=True, blank=True)
    delivery_slot = models.CharField(max_length=30, blank=True, default="", choices=get_slot_choices())
    same_day_delivery = models.BooleanField(default=False)
    gift_message = models.TextField(blank=True, default="")
    occasion = models.CharField(max_length=30, blank=True, default="", choices=OCCASION_CHOICES)
    delivery_status = models.CharField(
        max_length=30,
        choices=DELIVERY_STATUS_CHOICES,
        default=DELIVERY_STATUS_ORDER_PLACED,
    )
    delivery_status_updated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["payment_order_id"],
                condition=~Q(payment_order_id=""),
                name="uniq_order_payment_order_id",
            ),
            models.UniqueConstraint(
                fields=["payment_id"],
                condition=~Q(payment_id=""),
                name="uniq_order_payment_id",
            ),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.name}"


class OrderHistory(models.Model):
    source_order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_entries",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_history_entries",
    )
    customer_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True, default="")
    city = models.CharField(max_length=50, blank=True, default="")
    pincode = models.CharField(max_length=10, blank=True, default="")
    items = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES, default=Order.STATUS_PENDING)
    total_amount = models.IntegerField(default=0)
    payment_order_id = models.CharField(max_length=100, blank=True, default="")
    payment_id = models.CharField(max_length=100, blank=True, default="")
    mongo_order_id = models.CharField(max_length=100, blank=True, default="")
    delivery_date = models.DateField(null=True, blank=True)
    delivery_slot = models.CharField(max_length=30, blank=True, default="", choices=get_slot_choices())
    same_day_delivery = models.BooleanField(default=False)
    gift_message = models.TextField(blank=True, default="")
    occasion = models.CharField(max_length=30, blank=True, default="", choices=Order.OCCASION_CHOICES)
    delivery_status = models.CharField(
        max_length=30,
        choices=Order.DELIVERY_STATUS_CHOICES,
        default=Order.DELIVERY_STATUS_ORDER_PLACED,
    )
    ordered_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ordered_at", "-id"]
        verbose_name = "Order History"
        verbose_name_plural = "Order History"

    def __str__(self):
        return f"History #{self.id} - {self.customer_name}"


class OrderTrackingEvent(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="tracking_events")
    status = models.CharField(max_length=30, choices=Order.DELIVERY_STATUS_CHOICES)
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Tracking #{self.id} - Order #{self.order_id} - {self.status}"


class Feedback(models.Model):
    TARGET_SHOP = "shop"
    TARGET_FLOWER = "flower"
    TARGET_CHOICES = [
        (TARGET_SHOP, "Shop"),
        (TARGET_FLOWER, "Flower"),
    ]
    STATUS_PENDING = "pending"
    STATUS_REVIEWED = "reviewed"
    STATUS_HIDDEN = "hidden"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_REVIEWED, "Reviewed"),
        (STATUS_HIDDEN, "Hidden"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback_entries",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback_entries",
    )
    target_type = models.CharField(max_length=50, blank=True, default="shop")
    rating = models.PositiveSmallIntegerField(default=5)
    title = models.CharField(max_length=120)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Feedback #{self.id} - {self.title}"
