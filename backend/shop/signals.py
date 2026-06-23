from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .delivery import get_delivery_status_label
from .models import Order, OrderHistory, OrderTrackingEvent, UserProfile


def upsert_order_history(order):
    defaults = {
        "user": order.user,
        "customer_name": order.name,
        "phone": order.phone,
        "city": order.city,
        "pincode": order.pincode,
        "items": order.items,
        "status": order.status,
        "total_amount": order.total_amount,
        "payment_order_id": order.payment_order_id,
        "payment_id": order.payment_id,
        "legacy_order_id": order.legacy_order_id,
        "delivery_date": order.delivery_date,
        "delivery_slot": order.delivery_slot,
        "same_day_delivery": order.same_day_delivery,
        "gift_message": order.gift_message,
        "occasion": order.occasion,
        "delivery_status": order.delivery_status,
        "ordered_at": order.created_at,
    }
    OrderHistory.objects.update_or_create(
        source_order=order,
        defaults=defaults,
    )


@receiver(post_save, sender=Order)
def sync_order_history_after_save(sender, instance, **kwargs):
    upsert_order_history(instance)
    if not instance.tracking_events.exists():
        OrderTrackingEvent.objects.create(
            order=instance,
            status=instance.delivery_status,
            title=get_delivery_status_label(instance.delivery_status) or "Order update",
            description="Your floral order has been confirmed and queued for our design studio.",
        )


@receiver(post_save, sender=OrderHistory)
def sync_django_order_history_after_save(sender, instance, **kwargs):
    return None


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


from django.db.models.signals import post_migrate

@receiver(post_migrate)
def setup_social_app_and_site(sender, **kwargs):
    if sender.name != "shop":
        return
    try:
        from django.contrib.sites.models import Site
        from allauth.socialaccount.models import SocialApp
        from django.conf import settings
        import os

        site = Site.objects.filter(id=settings.SITE_ID).first()
        domain = os.environ.get("DJANGO_DEFAULT_FRONTEND_ORIGIN", "http://localhost:3000").split("//")[-1].split(":")[0]
        if not domain:
            domain = "localhost"

        if site:
            site.domain = domain
            site.name = "Petals and Floras"
            site.save()
        else:
            Site.objects.create(id=settings.SITE_ID, domain=domain, name="Petals and Floras")

        # Delete any DB-backed Google SocialApp records to prevent MultipleObjectsReturned conflict
        # with the settings-based configuration in config/settings.py
        SocialApp.objects.filter(provider="google").delete()
    except Exception:
        pass
