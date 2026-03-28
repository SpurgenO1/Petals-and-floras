from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from pymongo.errors import PyMongoError

from .models import Product
from .mongo import delete_product_from_mongo, sync_product_to_mongo


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
