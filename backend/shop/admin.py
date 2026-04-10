from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import User
from django.db.models import Count, Max, Sum, Value
from django.db.models.functions import Coalesce

from .delivery import get_delivery_status_label, get_slot_label
from .models import Feedback, Order, OrderHistory, OrderTrackingEvent, Product

admin.site.site_header = "Petals & Floras Administration"
admin.site.site_title = "Petals & Floras Admin"
admin.site.index_title = "Users, products, and order history"


class OrderInline(admin.TabularInline):
    model = Order
    extra = 0
    fields = ("id", "status", "delivery_status", "total_amount", "mongo_order_id", "created_at")
    readonly_fields = fields
    can_delete = False
    show_change_link = True


class OrderHistoryInline(admin.TabularInline):
    model = OrderHistory
    extra = 0
    fields = ("id", "status", "delivery_status", "total_amount", "mongo_order_id", "ordered_at")
    readonly_fields = fields
    can_delete = False
    show_change_link = True


class OrderTrackingEventInline(admin.TabularInline):
    model = OrderTrackingEvent
    extra = 0
    fields = ("status", "title", "description", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "price")
    list_filter = ("category",)
    search_fields = ("name", "category", "description")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "name",
        "phone",
        "status",
        "delivery_status_badge",
        "delivery_slot_badge",
        "total_amount",
        "item_count",
        "mongo_order_id",
        "created_at",
    )
    list_filter = ("status", "delivery_status", "same_day_delivery", "created_at")
    search_fields = (
        "name",
        "phone",
        "city",
        "payment_order_id",
        "payment_id",
        "mongo_order_id",
        "user__username",
        "user__email",
    )
    readonly_fields = ("created_at", "mongo_order_id", "delivery_status_updated_at")
    date_hierarchy = "created_at"
    list_select_related = ("user",)
    ordering = ("-created_at",)
    inlines = [OrderTrackingEventInline]

    @admin.display(description="Items")
    def item_count(self, obj):
        return sum(int(item.get("qty", 1)) for item in obj.items if isinstance(item, dict))

    @admin.display(description="Delivery")
    def delivery_status_badge(self, obj):
        return get_delivery_status_label(obj.delivery_status) or "-"

    @admin.display(description="Window")
    def delivery_slot_badge(self, obj):
        return get_slot_label(obj.delivery_slot) or "-"


@admin.register(OrderHistory)
class OrderHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "source_order",
        "user",
        "customer_name",
        "status",
        "delivery_status",
        "total_amount",
        "mongo_order_id",
        "ordered_at",
    )
    list_filter = ("status", "delivery_status", "same_day_delivery", "ordered_at")
    search_fields = (
        "customer_name",
        "phone",
        "city",
        "payment_order_id",
        "payment_id",
        "mongo_order_id",
        "user__username",
        "user__email",
    )
    readonly_fields = ("ordered_at", "updated_at", "mongo_order_id")
    list_select_related = ("user", "source_order")
    ordering = ("-ordered_at",)


@admin.register(OrderTrackingEvent)
class OrderTrackingEventAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "title", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order__id", "title", "description", "order__name")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "target_type",
        "product",
        "user",
        "rating",
        "status",
        "created_at",
    )
    list_filter = ("target_type", "status", "rating", "created_at")
    search_fields = ("title", "message", "user__username", "user__email", "product__name")
    list_select_related = ("user", "product")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    actions = ("mark_reviewed", "hide_feedback")

    @admin.action(description="Mark selected feedback as reviewed")
    def mark_reviewed(self, request, queryset):
        updated = queryset.update(status=Feedback.STATUS_REVIEWED)
        self.message_user(request, f"{updated} feedback item(s) marked as reviewed.")

    @admin.action(description="Hide selected feedback")
    def hide_feedback(self, request, queryset):
        updated = queryset.update(status=Feedback.STATUS_HIDDEN)
        self.message_user(request, f"{updated} feedback item(s) hidden.")


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "username",
        "email",
        "full_name",
        "is_active",
        "is_staff",
        "is_superuser",
        "order_count",
        "total_spent",
        "last_order_at",
        "date_joined",
    )
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    list_filter = ("is_active", "is_staff", "is_superuser", "date_joined", "last_login")
    readonly_fields = ("date_joined", "last_login", "order_count", "total_spent", "last_order_at")
    actions = ("activate_users", "deactivate_users", "grant_staff_access", "remove_staff_access")
    inlines = [OrderInline, OrderHistoryInline]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Shop Controls",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Shop Activity",
            {
                "fields": (
                    "order_count",
                    "total_spent",
                    "last_order_at",
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            shop_order_count=Count("orders", distinct=True),
            shop_total_spent=Coalesce(Sum("orders__total_amount"), Value(0)),
            shop_last_order_at=Max("orders__created_at"),
        )

    @admin.display(description="Name")
    def full_name(self, obj):
        return obj.get_full_name().strip() or "-"

    @admin.display(description="Orders", ordering="shop_order_count")
    def order_count(self, obj):
        return obj.shop_order_count

    @admin.display(description="Spent", ordering="shop_total_spent")
    def total_spent(self, obj):
        return f"Rs. {int(obj.shop_total_spent or 0)}"

    @admin.display(description="Last order", ordering="shop_last_order_at")
    def last_order_at(self, obj):
        return obj.shop_last_order_at or "-"

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} user(s) activated.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated.")

    @admin.action(description="Grant staff access to selected users")
    def grant_staff_access(self, request, queryset):
        updated = queryset.update(is_staff=True)
        self.message_user(request, f"{updated} user(s) granted staff access.")

    @admin.action(description="Remove staff access from selected users")
    def remove_staff_access(self, request, queryset):
        updated = queryset.update(is_staff=False)
        self.message_user(request, f"{updated} user(s) had staff access removed.")
