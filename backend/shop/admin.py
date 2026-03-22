from django.contrib import admin

from .models import Order, Product

admin.site.register(Product)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "phone", "status", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "phone", "city", "payment_order_id", "payment_id")
