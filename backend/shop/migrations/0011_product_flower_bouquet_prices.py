from django.db import migrations, models


CATEGORY_PRICE_DEFAULTS = {
    "Roses": {"flower": 80, "bouquet": 699},
    "Carnations": {"flower": 45, "bouquet": 549},
    "Asiatic Lilies": {"flower": 160, "bouquet": 999},
    "Oriental Lilies": {"flower": 220, "bouquet": 1299},
    "Exotic & Novelties": {"flower": 180, "bouquet": 1199},
    "Gerberas": {"flower": 60, "bouquet": 599},
    "Orchids": {"flower": 180, "bouquet": 1199},
    "Fillers": {"flower": 35, "bouquet": 399},
    "Cut Foliages": {"flower": 30, "bouquet": 349},
    "Hybrid Chrysanthamums": {"flower": 55, "bouquet": 549},
    "Bouquet & Car Deco Materials": {"flower": 75, "bouquet": 299},
    "Real Flower Bouquets": {"flower": 699, "bouquet": 699},
    "Artificial Flower Bouquets": {"flower": 799, "bouquet": 799},
    "Chocolate Bouquets": {"flower": 899, "bouquet": 899},
    "Jewelry Bouquets": {"flower": 1299, "bouquet": 1299},
    "Gift Bouquets": {"flower": 999, "bouquet": 999},
    "Handmade Bouquets": {"flower": 899, "bouquet": 899},
    "Occasion Bouquets": {"flower": 1199, "bouquet": 1199},
    "Innovative Bouquets": {"flower": 1399, "bouquet": 1399},
}


def get_catalog_prices(category, item_index):
    defaults = CATEGORY_PRICE_DEFAULTS.get(category, {"flower": 75, "bouquet": 599})
    variation = (int(item_index) % 5) * 10
    flower_price = defaults["flower"] + variation
    bouquet_price = max(defaults["bouquet"] + variation * 4, flower_price)
    return flower_price, bouquet_price


def copy_product_prices(apps, schema_editor):
    Product = apps.get_model("shop", "Product")
    category_counts = {}
    for product in Product.objects.all().order_by("id"):
        base_price = int(product.price or 0)
        category = product.category or "Floral"
        item_index = category_counts.get(category, 0)
        category_counts[category] = item_index + 1
        default_flower_price, default_bouquet_price = get_catalog_prices(category, item_index)
        product.flower_price = base_price or default_flower_price
        product.bouquet_price = base_price or default_bouquet_price
        product.price = product.flower_price
        product.save(update_fields=["price", "flower_price", "bouquet_price"])


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0010_order_security_constraints"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="flower_price",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="product",
            name="bouquet_price",
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(copy_product_prices, migrations.RunPython.noop),
    ]
