import os

import pymongo
import django
from shop.catalog import build_seed_products
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
os.environ.setdefault("DJANGO_SECRET_KEY", "dev-local-secret-key")
django.setup()

from shop.models import Product

client = pymongo.MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
collection = db["products"]

products = build_seed_products()

collection.delete_many({}) 
collection.insert_many(products)

Product.objects.all().delete()
Product.objects.bulk_create(
    [
        Product(
            name=item["name"],
            price=item["price"],
            description=item["description"],
            category=item["category"],
        )
        for item in products
    ]
)

print("Database populated successfully.")
