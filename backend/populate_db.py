import os

import django
from shop.catalog import build_seed_products
from django.core.management.color import no_style
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
os.environ.setdefault("DJANGO_SECRET_KEY", "dev-local-secret-key")
django.setup()

from shop.models import Product

products = build_seed_products()

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

print(f"Database populated successfully. SQLite/Django products: {Product.objects.count()}")
