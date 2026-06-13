import os

import pymongo
import django
from shop.catalog import build_seed_products
from django.conf import settings
from django.core.management.color import no_style
from django.db import connection
from pymongo.errors import PyMongoError

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
os.environ.setdefault("DJANGO_SECRET_KEY", "dev-local-secret-key")
django.setup()

from shop.models import Product
from shop.mongo import sync_product_to_mongo

client = pymongo.MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
collection = db["products"]

products = build_seed_products()

collection.delete_many({}) 
collection.insert_many(products)

Product.objects.all().delete()
sequence_sql = connection.ops.sequence_reset_sql(no_style(), [Product])
with connection.cursor() as cursor:
    for sql in sequence_sql:
        cursor.execute(sql)
    if connection.vendor == "sqlite":
        cursor.execute("DELETE FROM sqlite_sequence WHERE name = %s", [Product._meta.db_table])

Product.objects.bulk_create(
    [
        Product(
            name=item["name"],
            price=item["price"],
            flower_price=item.get("flower_price", item["price"]),
            bouquet_price=item.get("bouquet_price", item.get("flower_price", item["price"])),
            description=item["description"],
            category=item["category"],
        )
        for item in products
    ]
)

synced_products = 0
for product in Product.objects.all().order_by("id"):
    try:
        sync_product_to_mongo(product)
        synced_products += 1
    except PyMongoError as error:
        print(f"Failed to sync product {product.id} to MongoDB: {error}")

print(f"Database populated successfully. Django products: {Product.objects.count()}, MongoDB synced: {synced_products}")
