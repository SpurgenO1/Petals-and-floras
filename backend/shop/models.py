from django.db import models
from django.contrib.auth.models import User


class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.IntegerField()
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_PAID = "Paid"
    STATUS_CANCELLED = "Cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

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
    created_at = models.DateTimeField(auto_now_add=True)

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
    ordered_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ordered_at", "-id"]
        verbose_name = "Order History"
        verbose_name_plural = "Order History"

    def __str__(self):
        return f"History #{self.id} - {self.customer_name}"


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
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default=TARGET_SHOP)
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
