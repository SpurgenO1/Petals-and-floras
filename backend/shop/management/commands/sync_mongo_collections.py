from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from pymongo.errors import PyMongoError

from shop.models import Order, Product
from shop.mongo import (
    sync_order_history_to_mongo,
    sync_product_to_mongo,
    sync_user_to_mongo,
)


class Command(BaseCommand):
    help = "Backfill MongoDB collections for products, users, and order history."

    def handle(self, *args, **options):
        synced_products = 0
        synced_users = 0
        synced_order_history = 0

        for product in Product.objects.all().order_by("id"):
            try:
                sync_product_to_mongo(product)
                synced_products += 1
            except PyMongoError as error:
                self.stderr.write(f"Failed to sync product {product.id}: {error}")

        for user in User.objects.all().order_by("id"):
            try:
                sync_user_to_mongo(user)
                synced_users += 1
            except PyMongoError as error:
                self.stderr.write(f"Failed to sync user {user.id}: {error}")

        for order in Order.objects.select_related("user").all().order_by("id"):
            try:
                sync_order_history_to_mongo(order)
                synced_order_history += 1
            except PyMongoError as error:
                self.stderr.write(f"Failed to sync order history {order.id}: {error}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Mongo sync complete. Products: {synced_products}, Users: {synced_users}, Order history: {synced_order_history}"
            )
        )
