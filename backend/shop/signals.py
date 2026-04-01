from django.db.models.signals import post_delete, post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from pymongo.errors import PyMongoError

from .models import Feedback, Order, OrderHistory, Product
from .mongo import (
    delete_feedback_from_mongo,
    delete_product_from_mongo,
    delete_user_from_mongo,
    sync_feedback_to_mongo,
    sync_order_history_to_mongo,
    sync_product_to_mongo,
    sync_user_to_mongo,
)


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
        "mongo_order_id": order.mongo_order_id,
        "ordered_at": order.created_at,
    }
    OrderHistory.objects.update_or_create(
        source_order=order,
        defaults=defaults,
    )


@receiver(post_save, sender=Product)
def sync_product_after_save(sender, instance, **kwargs):
    try:
        sync_product_to_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_delete, sender=Product)
def sync_product_after_delete(sender, instance, **kwargs):
    try:
        delete_product_from_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_save, sender=User)
def sync_user_after_save(sender, instance, **kwargs):
    try:
        sync_user_to_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_delete, sender=User)
def sync_user_after_delete(sender, instance, **kwargs):
    try:
        delete_user_from_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_save, sender=Order)
def sync_order_history_after_save(sender, instance, **kwargs):
    upsert_order_history(instance)
    try:
        sync_order_history_to_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_save, sender=OrderHistory)
def sync_django_order_history_after_save(sender, instance, **kwargs):
    if instance.source_order_id:
        try:
            sync_order_history_to_mongo(instance.source_order)
        except PyMongoError:
            pass


@receiver(post_save, sender=Feedback)
def sync_feedback_after_save(sender, instance, **kwargs):
    try:
        sync_feedback_to_mongo(instance)
    except PyMongoError:
        pass


@receiver(post_delete, sender=Feedback)
def sync_feedback_after_delete(sender, instance, **kwargs):
    try:
        delete_feedback_from_mongo(instance)
    except PyMongoError:
        pass
